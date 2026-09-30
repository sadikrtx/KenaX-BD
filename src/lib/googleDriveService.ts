import { auth, db } from './firebase.ts';
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Scopes required for Google Drive integration
export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedPermanentKey: string | null = null;
let cachedUser: any = null;
let cachedFolderId: string | null = null;

// Initial local storage hydration for instant offline & reload permanence
if (typeof window !== 'undefined') {
  try {
    const localToken = localStorage.getItem('kenax_google_drive_token');
    const localPermKey = localStorage.getItem('kenax_google_drive_permanent_key');
    const localUser = localStorage.getItem('kenax_google_drive_user');
    const localFolderId = localStorage.getItem('kenax_google_drive_folder_id');
    if (localToken) cachedAccessToken = localToken;
    if (localPermKey) cachedPermanentKey = localPermKey;
    if (localUser) cachedUser = JSON.parse(localUser);
    if (localFolderId) cachedFolderId = localFolderId;
  } catch {}
}

// Background sync from Server and Firestore on load
export const hydrateGoogleDriveState = async (): Promise<{ token: string | null; user: any; permanentKey: string | null }> => {
  // 1. Try local memory
  if ((cachedPermanentKey || cachedAccessToken) && cachedUser) {
    return { token: cachedPermanentKey || cachedAccessToken, user: cachedUser, permanentKey: cachedPermanentKey };
  }

  // 2. Try LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const localToken = localStorage.getItem('kenax_google_drive_token');
      const localPermKey = localStorage.getItem('kenax_google_drive_permanent_key');
      const localUser = localStorage.getItem('kenax_google_drive_user');
      if (localPermKey) cachedPermanentKey = localPermKey;
      if (localToken) cachedAccessToken = localToken;
      if (localUser) cachedUser = JSON.parse(localUser);
    } catch {}
  }

  // 3. Try Server Store
  try {
    const res = await fetch('/api/drive/token');
    if (res.ok) {
      const data = await res.json();
      if (data.token || data.permanentKey) {
        if (data.permanentKey) cachedPermanentKey = data.permanentKey;
        if (data.token) cachedAccessToken = data.token;
        cachedUser = data.user || cachedUser;
        if (data.folderId) cachedFolderId = data.folderId;
        if (typeof window !== 'undefined') {
          try {
            if (data.token) localStorage.setItem('kenax_google_drive_token', data.token);
            if (data.permanentKey) localStorage.setItem('kenax_google_drive_permanent_key', data.permanentKey);
            if (data.user) localStorage.setItem('kenax_google_drive_user', JSON.stringify(data.user));
            if (data.folderId) localStorage.setItem('kenax_google_drive_folder_id', data.folderId);
          } catch {}
        }
        return { token: cachedPermanentKey || cachedAccessToken, user: cachedUser, permanentKey: cachedPermanentKey };
      }
    }
  } catch {}

  // 4. Try Firestore doc settings/google_drive
  try {
    const snap = await getDoc(doc(db, 'settings', 'google_drive'));
    if (snap.exists()) {
      const data = snap.data();
      if (data?.permanentKey) cachedPermanentKey = data.permanentKey;
      if (data?.token) cachedAccessToken = data.token;
      cachedUser = data.user || cachedUser;
      if (data.folderId) cachedFolderId = data.folderId;
      if (typeof window !== 'undefined') {
        try {
          if (data.permanentKey) localStorage.setItem('kenax_google_drive_permanent_key', data.permanentKey);
          if (data.token) localStorage.setItem('kenax_google_drive_token', data.token);
          if (data.user) localStorage.setItem('kenax_google_drive_user', JSON.stringify(data.user));
          if (data.folderId) localStorage.setItem('kenax_google_drive_folder_id', data.folderId);
        } catch {}
      }
    }
  } catch {}

  return { token: cachedPermanentKey || cachedAccessToken, user: cachedUser, permanentKey: cachedPermanentKey };
};

// Save Permanent Google Drive App Key (never expires, persists across reloads and offline/online transitions)
export const saveGoogleDrivePermanentKey = async (
  key: string,
  userEmail: string = 'sadikrtx3060@gmail.com'
): Promise<boolean> => {
  const cleanKey = key.trim();
  cachedPermanentKey = cleanKey;
  if (!cachedUser) {
    cachedUser = { email: userEmail, displayName: 'KenaX Admin (Permanent Key)' };
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('kenax_google_drive_permanent_key', cleanKey);
      localStorage.setItem('kenax_google_drive_user', JSON.stringify(cachedUser));
    } catch {}
  }

  // Sync with Server
  fetch('/api/drive/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: cleanKey,
      permanentKey: cleanKey,
      userEmail,
      userName: 'KenaX Admin (Permanent Key)',
    }),
  }).catch(() => {});

  // Persist to Firestore
  try {
    await setDoc(
      doc(db, 'settings', 'google_drive'),
      {
        permanentKey: cleanKey,
        token: cleanKey,
        user: cachedUser,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn('[Google Drive] Firestore permanent key save notice:', err);
    return true;
  }
};

// Auto hydrate immediately
hydrateGoogleDriveState().catch(() => {});

// Initialize Auth listener to clear token when user signs out explicitly
export const initGoogleDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  hydrateGoogleDriveState().then(({ token, user }) => {
    if (token && user && onAuthSuccess) {
      onAuthSuccess(user as User, token);
    }
  });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      cachedUser = user;
      if (cachedAccessToken && onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      // Retain persistent token even if standard Firebase auth changes, unless explicitly disconnected
      if (!isSigningIn && !cachedAccessToken) {
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

export const getGoogleUser = (): User | null => cachedUser;

export const getGoogleAccessToken = async (): Promise<string | null> => {
  if (cachedPermanentKey) return cachedPermanentKey;
  if (cachedAccessToken) return cachedAccessToken;
  const hydrated = await hydrateGoogleDriveState();
  return hydrated.permanentKey || hydrated.token;
};

// Sign in with Google to get Drive access token
export const signInWithGoogleDrive = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google sign in');
    }
    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;

    // 1. Save to LocalStorage for instant offline recovery
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('kenax_google_drive_token', cachedAccessToken);
        localStorage.setItem(
          'kenax_google_drive_user',
          JSON.stringify({
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
          })
        );
      } catch {}
    }

    // 2. Sync token with server so customer reviews upload seamlessly to this Admin Google Drive
    fetch('/api/drive/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: cachedAccessToken,
        userEmail: result.user.email,
        userName: result.user.displayName,
      }),
    }).catch(() => {});

    // 3. Persist to Firestore for permanent cross-device & cloud sync
    try {
      setDoc(
        doc(db, 'settings', 'google_drive'),
        {
          token: cachedAccessToken,
          user: {
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
          },
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});
    } catch {}

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: any) {
    console.error('[Google Drive Auth Error]:', err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const logoutGoogleDrive = async () => {
  cachedAccessToken = null;
  cachedFolderId = null;
  cachedUser = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('kenax_google_drive_token');
      localStorage.removeItem('kenax_google_drive_user');
      localStorage.removeItem('kenax_google_drive_folder_id');
    } catch {}
  }
  fetch('/api/drive/token', { method: 'DELETE' }).catch(() => {});
  try {
    setDoc(doc(db, 'settings', 'google_drive'), { token: null, user: null, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
  } catch {}
};

/**
 * Extracts Google Drive File ID from any Google Drive sharing/view/preview link
 */
export function extractDriveFileId(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  // If it is already a direct file ID (alphanumeric with underscores and hyphens, typically 25-45 chars)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed) && !trimmed.includes('/') && !trimmed.includes('.')) {
    return trimmed;
  }

  // https://drive.google.com/file/d/FILE_ID/view...
  const matchFileD = trimmed.match(/\/file(?:\/u\/\d+)?\/d\/([a-zA-Z0-9_-]+)/i);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  // https://drive.google.com/open?id=FILE_ID or ?id=FILE_ID
  const matchOpenId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (matchOpenId && matchOpenId[1]) return matchOpenId[1];

  // https://lh3.googleusercontent.com/d/FILE_ID
  const matchLh3 = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/i);
  if (matchLh3 && matchLh3[1]) return matchLh3[1];

  // https://drive.google.com/uc?id=FILE_ID
  const matchUc = trimmed.match(/\/uc\?.*id=([a-zA-Z0-9_-]+)/i);
  if (matchUc && matchUc[1]) return matchUc[1];

  return null;
}

export function getDriveStandardViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;
}

/**
 * High-speed direct media CDN URL for HTML <img> tags
 */
export function getDriveDirectImageUrl(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  const fileId = extractDriveFileId(trimmed);
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return trimmed;
}

/**
 * Standard permanent Google Drive image CDN URL for reviews and products
 */
export function getDrivePermanentUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * Automatically resolves any user-pasted Google Drive link or image URL
 * into high-speed Google Drive image CDN format so it loads instantly without breaking.
 */
export function resolveGoogleDriveUrl(inputUrl: string): string {
  if (!inputUrl) return '';
  const trimmed = inputUrl.trim();
  const fileId = extractDriveFileId(trimmed);
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return trimmed;
}

/**
 * Image error handler fallback:
 * If lh3 CDN has a temporary block, try the direct Google Drive uc export view stream
 */
export function handleImageErrorFallback(e: any, originalUrl?: string) {
  const target = e.currentTarget || e.target;
  if (!target) return;
  const fileId = extractDriveFileId(originalUrl || target.src);
  if (fileId && !target.src.includes('uc?export=view')) {
    target.src = `https://drive.google.com/uc?export=view&id=${fileId}`;
    return;
  }
  target.onerror = null;
  target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400';
}

// Ensure "Customer Reviews" folder exists in Google Drive
export const getOrCreateReviewFolder = async (
  token: string
): Promise<string> => {
  if (cachedFolderId) return cachedFolderId;

  try {
    // 1. Search for existing folder named "Customer Reviews" created by this app
    const query = encodeURIComponent(
      "name = 'Customer Reviews' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    );
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        cachedFolderId = data.files[0].id;
        return cachedFolderId;
      }
    }

    // 2. Folder does not exist, create it
    const createRes = await fetch(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Customer Reviews',
          mimeType: 'application/vnd.google-apps.folder',
          description: 'Customer review photos and images from KenaX store',
        }),
      }
    );

    if (createRes.ok) {
      const created = await createRes.json();
      cachedFolderId = created.id;
      // Make the folder publicly readable so child links resolve smoothly
      await makeFilePubliclyViewable(created.id, token);
      return created.id;
    }
  } catch (err) {
    console.warn('[Google Drive Folder Search/Create Warning]:', err);
  }

  return 'root';
};

// Make a file publicly viewable so any customer can view the photo/video
export const makeFilePubliclyViewable = async (
  fileId: string,
  token: string
): Promise<boolean> => {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
};

/**
 * List files inside the "Customer Reviews" folder (Supports Google Apps Script Webhook & Direct Drive API)
 */
export const listReviewFolderFiles = async (
  token?: string
): Promise<
  Array<{
    id: string;
    name: string;
    url: string;
    mimeType: string;
    createdTime?: string;
    size?: string;
    driveLink?: string;
  }>
> => {
  // 1. Try Google Apps Script Webhook (no OAuth required)
  try {
    let webhookUrl = '';
    if (typeof window !== 'undefined') {
      webhookUrl = localStorage.getItem('kenax_google_drive_webhook') || '';
      if (!webhookUrl) {
        const rawSettings = localStorage.getItem('kenax_gmail_alert_settings');
        if (rawSettings) {
          try {
            const parsed = JSON.parse(rawSettings);
            webhookUrl = parsed.webhookUrl || '';
          } catch {}
        }
      }
    }

    if (webhookUrl && webhookUrl.includes('script.google.com')) {
      const gasRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'listReviewFiles' }),
      }).catch(() => null);

      if (gasRes && gasRes.ok) {
        const data = await gasRes.json().catch(() => null);
        if (data && Array.isArray(data.files) && data.files.length > 0) {
          return data.files.map((f: any) => ({
            id: f.id,
            name: f.name || 'Review Photo',
            url: f.url || getDrivePermanentUrl(f.id),
            driveLink: f.driveLink || `https://drive.google.com/uc?export=view&id=${f.id}`,
            mimeType: f.mimeType || 'image/jpeg',
            createdTime: f.createdTime,
            size: f.size,
          }));
        }
      }
    }
  } catch (gasErr) {
    console.warn('[Apps Script List Files Notice]:', gasErr);
  }

  // 2. Try Direct Google Drive API if token is available
  if (token) {
    try {
      const folderId = await getOrCreateReviewFolder(token);
      const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,thumbnailLink,createdTime,size)&orderBy=createdTime desc&pageSize=50`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        return (data.files || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          url: getDrivePermanentUrl(f.id),
          mimeType: f.mimeType,
          createdTime: f.createdTime,
          size: f.size,
        }));
      }
    } catch (err) {
      console.warn('[Google Drive List Files Warning]:', err);
    }
  }

  return [];
};

/**
 * Upload photo directly to Google Drive "Customer Reviews" folder
 */
export const uploadFileToGoogleDrive = async (
  file: File,
  token: string,
  onProgress?: (percent: number) => void
): Promise<{ fileId: string; url: string; name: string }> => {
  const folderId = await getOrCreateReviewFolder(token);

  // Metadata
  const metadata = {
    name: `review-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
    parents: folderId && folderId !== 'root' ? [folderId] : undefined,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const fileBuffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(fileBuffer);

  const metadataPart =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${file.type || 'application/octet-stream'}\r\n` +
    'Content-Transfer-Encoding: base64\r\n\r\n';

  let binary = '';
  const len = fileBytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(fileBytes[i]);
  }
  const base64Data = btoa(binary);

  const multipartRequestBody = metadataPart + base64Data + closeDelimiter;

  if (onProgress) onProgress(40);

  let uploadedFileId: string | null = null;
  let uploadedUrl: string | null = null;
  let uploadedName = metadata.name;

  // If token is an API key (e.g. AIzaSy...) rather than an OAuth Bearer token (ya29...),
  // Google Drive upload API will reject it with 401. Route directly to server relay or data URL.
  const isApiTokenNotOAuth = token && token.startsWith('AIzaSy');

  if (!isApiTokenNotOAuth) {
    try {
      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      if (onProgress) onProgress(75);

      if (res.ok) {
        const uploaded = await res.json();
        uploadedFileId = uploaded.id;
        uploadedUrl = getDrivePermanentUrl(uploaded.id);
        uploadedName = uploaded.name;
        // Make readable by anyone so it can display as product review media without restriction
        await makeFilePubliclyViewable(uploaded.id, token);
      } else {
        console.warn(`[Google Drive Direct Upload Status ${res.status}], using fallback relay...`);
      }
    } catch (directErr) {
      console.warn('[Google Drive Direct Upload Error], using fallback relay...', directErr);
    }
  }

  // If direct drive upload was not possible or returned 401, try server relay
  if (!uploadedUrl) {
    try {
      const CLOUD_RUN_API_BASE = 'https://ais-pre-nziktgpe56nlsqktopppvl-693170375322.asia-southeast1.run.app';
      let relayRes: Response | null = null;
      try {
        relayRes = await fetch('/api/drive/customer-review-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type || 'image/jpeg',
            base64Data,
          }),
        });
      } catch {}

      if (!relayRes || !relayRes.ok) {
        relayRes = await fetch(`${CLOUD_RUN_API_BASE}/api/drive/customer-review-upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type || 'image/jpeg',
            base64Data,
          }),
        }).catch(() => null);
      }

      if (relayRes && relayRes.ok) {
        const data = await relayRes.json();
        if (data.url) {
          uploadedUrl = data.url;
          uploadedFileId = data.fileId || `drive-${Date.now()}`;
        }
      }
    } catch (relayErr) {
      console.warn('[Google Drive Relay Error]:', relayErr);
    }
  }

  // Ultimate safe fallback: local Data URI so user NEVER loses their photo!
  if (!uploadedUrl) {
    uploadedUrl = `data:${file.type || 'image/jpeg'};base64,${base64Data}`;
    uploadedFileId = `local-${Date.now()}`;
  }

  if (onProgress) onProgress(100);

  return {
    fileId: uploadedFileId || `img-${Date.now()}`,
    url: uploadedUrl,
    name: uploadedName,
  };
};

/**
 * Universal Review Photo Upload:
 * Handles seamless customer upload directly to Google Drive via server or Google Apps Script relay
 * without prompting the customer for any Google sign-in.
 */
export const uploadCustomerReviewPhoto = async (
  file: File,
  optionsOrProgress?:
    | {
        productTitle?: string;
        customerName?: string;
        onProgress?: (percent: number) => void;
      }
    | ((percent: number) => void)
): Promise<{ url: string; fileId?: string; isGoogleDrive: boolean; name?: string }> => {
  let onProgress: ((percent: number) => void) | undefined;
  let productTitle = '';
  let customerName = '';

  if (typeof optionsOrProgress === 'function') {
    onProgress = optionsOrProgress;
  } else if (optionsOrProgress && typeof optionsOrProgress === 'object') {
    onProgress = optionsOrProgress.onProgress;
    productTitle = optionsOrProgress.productTitle || '';
    customerName = optionsOrProgress.customerName || '';
  }

  // Format custom filename as: "[Product Title] - [Customer Name].[ext]"
  const ext = file.name.includes('.')
    ? file.name.split('.').pop() || 'jpg'
    : (file.type ? file.type.split('/')[1] : 'jpg') || 'jpg';

  let customFilename = file.name;
  const pTitleClean = productTitle.replace(/[/\\?%*:|"<>]/g, ' ').trim();
  const cNameClean = customerName.replace(/[/\\?%*:|"<>]/g, ' ').trim();

  if (pTitleClean && cNameClean) {
    customFilename = `${pTitleClean} - ${cNameClean}.${ext}`;
  } else if (pTitleClean) {
    customFilename = `${pTitleClean}.${ext}`;
  } else if (cNameClean) {
    customFilename = `${cNameClean} - Review.${ext}`;
  }

  if (onProgress) onProgress(20);

  // 1. Check if client has active Google Drive token
  const clientToken = await getGoogleAccessToken();
  if (clientToken) {
    try {
      const formattedFile = new File([file], customFilename, { type: file.type || 'image/jpeg' });
      const driveRes = await uploadFileToGoogleDrive(formattedFile, clientToken, onProgress);
      return {
        url: driveRes.url,
        fileId: driveRes.fileId,
        isGoogleDrive: true,
        name: customFilename,
      };
    } catch (clientErr) {
      console.warn('[Client Drive Upload Error, falling back to Server Relay]:', clientErr);
    }
  }

  // Read file data
  let base64Data = '';
  try {
    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    let binary = '';
    const len = fileBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(fileBytes[i]);
    }
    base64Data = btoa(binary);
  } catch (readErr) {
    console.warn('[File read error]:', readErr);
  }

  if (onProgress) onProgress(45);

  // 2. Upload via Google Apps Script Webhook to Google Drive "Customer Reviews" folder
  try {
    let webhookUrl = '';
    if (typeof window !== 'undefined') {
      webhookUrl = localStorage.getItem('kenax_google_drive_webhook') || '';
      if (!webhookUrl) {
        const rawSettings = localStorage.getItem('kenax_gmail_alert_settings');
        if (rawSettings) {
          try {
            const parsed = JSON.parse(rawSettings);
            webhookUrl = parsed.webhookUrl || '';
          } catch {}
        }
      }
    }
    if (!webhookUrl) {
      webhookUrl = 'https://script.google.com/macros/s/AKfycbz-561X29AU3IfkMxvjh__Wi6F9U0NteYNFIg7B2RpD8V5pbAvNoSVFP2Nu35NdP5HjXA/exec';
    }

    if (webhookUrl && webhookUrl.includes('script.google.com') && base64Data) {
      const gasRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'uploadReviewPhoto',
          filename: customFilename,
          productTitle: pTitleClean,
          customerName: cNameClean,
          mimeType: file.type || 'image/jpeg',
          base64Data,
        }),
      }).catch(() => null);

      if (gasRes && gasRes.ok) {
        const data = await gasRes.json().catch(() => null);
        if (data && data.url) {
          if (onProgress) onProgress(100);
          return {
            url: data.url,
            fileId: data.fileId,
            isGoogleDrive: true,
            name: customFilename,
          };
        }
      }
    }
  } catch (gasErr) {
    console.warn('[Google Apps Script Photo Upload]:', gasErr);
  }

  // 3. Upload through Server Relay with linked Admin Google Drive
  try {
    if (base64Data) {
      if (onProgress) onProgress(65);

      const CLOUD_RUN_API_BASE = 'https://ais-pre-nziktgpe56nlsqktopppvl-693170375322.asia-southeast1.run.app';
      const isNetlifyOrExternal = typeof window !== 'undefined' && (
        window.location.hostname.includes('netlify.app') ||
        (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('run.app'))
      );

      let res: Response | null = null;
      try {
        res = await fetch('/api/drive/customer-review-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: customFilename,
            productTitle: pTitleClean,
            customerName: cNameClean,
            mimeType: file.type || 'image/jpeg',
            base64Data,
          }),
        });
      } catch (e) {
        console.warn('[Local Server Drive Relay Notice]:', e);
      }

      if ((!res || !res.ok) && (isNetlifyOrExternal || !res)) {
        try {
          res = await fetch(`${CLOUD_RUN_API_BASE}/api/drive/customer-review-upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: customFilename,
              productTitle: pTitleClean,
              customerName: cNameClean,
              mimeType: file.type || 'image/jpeg',
              base64Data,
            }),
          });
        } catch (cloudErr) {
          console.warn('[Cloud Run Drive Relay Notice]:', cloudErr);
        }
      }

      if (onProgress) onProgress(85);

      if (res && res.ok) {
        const data = await res.json();
        if (data.url) {
          if (onProgress) onProgress(100);
          return {
            url: data.url,
            fileId: data.fileId,
            isGoogleDrive: Boolean(data.inDrive),
            name: customFilename,
          };
        }
      }
    }
  } catch (serverErr) {
    console.warn('[Server Drive Upload Error, using Local Data URI]:', serverErr);
  }

  // 4. Fallback: Compact Canvas compressed Data URI (max 800px, ~30KB) so Firestore 1MB limit is never exceeded
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = (e.target?.result as string) || '';
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDim = 800;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.72);
          if (onProgress) onProgress(100);
          resolve({ url: compressed, isGoogleDrive: false });
        } else {
          if (onProgress) onProgress(100);
          resolve({ url: rawDataUrl, isGoogleDrive: false });
        }
      };
      img.onerror = () => {
        if (onProgress) onProgress(100);
        resolve({ url: rawDataUrl, isGoogleDrive: false });
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      if (onProgress) onProgress(100);
      resolve({ url: '', isGoogleDrive: false });
    };
    reader.readAsDataURL(file);
  });
};
