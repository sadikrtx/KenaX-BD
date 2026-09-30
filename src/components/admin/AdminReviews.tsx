import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Star,
  CheckCircle,
  EyeOff,
  Trash2,
  Search,
  Check,
  X,
  MessageSquare,
  Edit3,
  Image as ImageIcon,
  Save,
  Shield,
  Upload,
  Cloud,
  FolderUp,
  Film,
  Loader2,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Copy,
  Folder,
  Layers,
  Link2,
  Key,
  ZoomIn,
  Settings,
  Filter,
} from 'lucide-react';
import { Review, UserRole, StaffUser, Product } from '../../types';
import {
  signInWithGoogleDrive,
  uploadFileToGoogleDrive,
  getGoogleAccessToken,
  getGoogleUser,
  initGoogleDriveAuth,
  resolveGoogleDriveUrl,
  extractDriveFileId,
  getDrivePermanentUrl,
  getDriveDirectImageUrl,
  handleImageErrorFallback,
  saveGoogleDrivePermanentKey,
  listReviewFolderFiles,
} from '../../lib/googleDriveService';
import type { User } from 'firebase/auth';

interface AdminReviewsProps {
  reviews: Review[];
  products?: Product[];
  onApproveReview: (reviewId: string) => void;
  onHideReview: (reviewId: string) => void;
  onDeleteReview: (reviewId: string) => void;
  onUpdateReview: (updatedReview: Review) => void;
  onAddDemoReview?: (newReview: Review) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
}

export const AdminReviews: React.FC<AdminReviewsProps> = ({
  reviews,
  products = [],
  onApproveReview,
  onHideReview,
  onDeleteReview,
  onUpdateReview,
  onAddDemoReview,
  currentRole,
  currentStaff,
}) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Collapsible Control Drawers (Keeps main dashboard compact & clutter-free)
  const [isDriveSettingsOpen, setIsDriveSettingsOpen] = useState(false);
  const [isMediaGalleryOpen, setIsMediaGalleryOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'script' | 'key' | 'auth'>('script');

  // Add Demo Review Modal state
  const [isAddDemoOpen, setIsAddDemoOpen] = useState(false);
  const [demoProductId, setDemoProductId] = useState(products[0]?.id || '');
  const [demoCustomerName, setDemoCustomerName] = useState('');
  const [demoRating, setDemoRating] = useState(5);
  const [demoComment, setDemoComment] = useState('');
  const [demoPhotos, setDemoPhotos] = useState<string[]>([]);
  const [demoPhotoInput, setDemoPhotoInput] = useState('');
  const [demoVerified, setDemoVerified] = useState(true);

  // Searchable Product Select state
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Google Drive integration states
  const [googleUser, setGoogleUser] = useState<User | null>(() => getGoogleUser());
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [driveStatusMsg, setDriveStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const directDriveUploadRef = useRef<HTMLInputElement>(null);

  // Google Drive Folder Live Media Explorer
  const [folderFiles, setFolderFiles] = useState<Array<{
    id: string;
    name: string;
    mimeType: string;
    createdTime?: string;
    size?: string;
    url: string;
    thumbnailUrl?: string;
  }>>([]);
  const [isLoadingFolderFiles, setIsLoadingFolderFiles] = useState(false);
  const [folderUrl, setFolderUrl] = useState<string | null>(null);

  // Recently uploaded photos in admin session / storage
  const [recentUploadedPhotos, setRecentUploadedPhotos] = useState<Array<{
    id: string;
    name: string;
    url: string;
    mimeType?: string;
    createdTime?: string;
  }>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('kenax_admin_uploaded_photos');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  // Tab filter for media gallery: 'all' | 'customer' | 'drive'
  const [galleryTab, setGalleryTab] = useState<'all' | 'customer' | 'drive'>('all');
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  // Google Apps Script Webhook State & Test Manager
  const [gasWebhookUrl, setGasWebhookUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kenax_google_drive_webhook');
      if (saved) return saved;
      const gmailSettings = localStorage.getItem('kenax_gmail_alert_settings');
      if (gmailSettings) {
        try {
          const parsed = JSON.parse(gmailSettings);
          if (parsed.webhookUrl) return parsed.webhookUrl;
        } catch {}
      }
    }
    return 'https://script.google.com/macros/s/AKfycbw_UtesYomtnwD4Y7FrIlUW4RvhLvAj428-xJz3nuz4fdk_O0gIfBZVQN_JeDWuvJxduw/exec';
  });
  const [isSavingGasWebhook, setIsSavingGasWebhook] = useState(false);
  const [isTestingGasWebhook, setIsTestingGasWebhook] = useState(false);
  const [gasTestResult, setGasTestResult] = useState<{ success: boolean; message: string; url?: string; folderUrl?: string } | null>(null);
  const [isScriptCodeCopied, setIsScriptCodeCopied] = useState(false);

  // Permanent Key (Google App Password / API Key style) state
  const [permanentKeyInput, setPermanentKeyInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kenax_google_drive_permanent_key') || '';
    }
    return '';
  });
  const [isSavingPermanentKey, setIsSavingPermanentKey] = useState(false);

  // URL Converter & Live Link Resolver State
  const [converterInput, setConverterInput] = useState('');
  const [resolvedConverterUrl, setResolvedConverterUrl] = useState('');

  // Editing state
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [newPhotoUrlInput, setNewPhotoUrlInput] = useState('');

  const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    // ১. কাস্টমার রিভিউ ফটো সরাসরি Google Drive ফোল্ডারে সেভ করা
    if (data.action === 'uploadReviewPhoto' || data.base64Data) {
      var folderName = "Customer Reviews";
      var folders = DriveApp.getFoldersByName(folderName);
      var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      var decoded = Utilities.base64Decode(data.base64Data);
      var blob = Utilities.newBlob(decoded, data.mimeType || 'image/jpeg', data.filename || 'review_photo.jpg');
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      var fileId = file.getId();
      var directUrl = "https://lh3.googleusercontent.com/d/" + fileId;
      var driveLink = "https://drive.google.com/uc?export=view&id=" + fileId;
      var folderUrl = folder.getUrl();
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileId: fileId,
        url: directUrl,
        driveLink: driveLink,
        folderUrl: folderUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ২. জিমেইল নোটিফিকেশন ইমেইল পাঠানো
    var to = data.to;
    var subject = data.subject || "KenaX BD Notification";
    var htmlBody = data.html || data.text || "Notification from KenaX BD";
    
    MailApp.sendEmail({
      to: to,
      subject: subject,
      htmlBody: htmlBody
    });
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      status: "Delivered"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  // Initialize Drive Auth
  useEffect(() => {
    initGoogleDriveAuth((user) => {
      setGoogleUser(user);
    });

    const checkToken = async () => {
      const token = await getGoogleAccessToken();
      if (token) {
        setGoogleToken(token);
        fetchDriveFolderFiles(token);
      } else if (permanentKeyInput.trim()) {
        fetchDriveFolderFiles(permanentKeyInput.trim());
      }
    };
    checkToken();
  }, [permanentKeyInput]);

  // Click outside to close product select dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered products for select dropdown
  const filteredProductsForSelect = useMemo(() => {
    if (!productSearchTerm.trim()) return products;
    const term = productSearchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.category && p.category.toLowerCase().includes(term)) ||
        (p.sku && p.sku.toLowerCase().includes(term))
    );
  }, [products, productSearchTerm]);

  const selectedProductObj = useMemo(() => {
    return products.find((p) => p.id === demoProductId) || products[0];
  }, [products, demoProductId]);

  // Collect all customer-uploaded review photos from existing reviews
  const customerUploadedPhotos = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      url: string;
      createdTime?: string;
      customerName: string;
      productName: string;
      reviewId: string;
      rating?: number;
    }> = [];
    (reviews || []).forEach((r) => {
      (r.photos || []).forEach((pUrl, idx) => {
        if (pUrl && typeof pUrl === 'string' && pUrl.trim()) {
          const directUrl = resolveGoogleDriveUrl(pUrl.trim());
          list.push({
            id: `cust-rev-${r.id}-${idx}`,
            name: `${r.customerName || (r as any).userName || 'Customer'} (${r.productName || 'Review'})`,
            url: directUrl,
            createdTime: r.createdAt,
            customerName: r.customerName || (r as any).userName || 'Customer',
            productName: r.productName || 'Product',
            reviewId: r.id,
            rating: r.rating,
          });
        }
      });
    });
    return list;
  }, [reviews]);

  // Merge Drive files & recent uploaded photos
  const driveAndUploadedMedia = useMemo(() => {
    const map = new Map<string, { id: string; name: string; url: string; createdTime?: string; isCustomer?: boolean; customerName?: string; productName?: string }>();
    recentUploadedPhotos.forEach((p) => {
      if (p.url) map.set(p.url, { ...p, isCustomer: false });
    });
    folderFiles.forEach((f) => {
      if (f.url && !map.has(f.url)) {
        map.set(f.url, { id: f.id, name: f.name, url: f.url, createdTime: f.createdTime, isCustomer: false });
      }
    });
    return Array.from(map.values());
  }, [recentUploadedPhotos, folderFiles]);

  const displayedMediaList = useMemo(() => {
    if (galleryTab === 'customer') {
      return customerUploadedPhotos.map((c) => ({ ...c, isCustomer: true }));
    }
    if (galleryTab === 'drive') {
      return driveAndUploadedMedia;
    }
    const map = new Map<string, { id: string; name: string; url: string; createdTime?: string; isCustomer?: boolean; customerName?: string; productName?: string }>();
    customerUploadedPhotos.forEach((c) => {
      map.set(c.url, { ...c, isCustomer: true });
    });
    driveAndUploadedMedia.forEach((d) => {
      if (!map.has(d.url)) {
        map.set(d.url, d);
      }
    });
    return Array.from(map.values());
  }, [galleryTab, customerUploadedPhotos, driveAndUploadedMedia]);

  // Category / Status Counts for Badges
  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let hidden = 0;
    let photos = 0;
    let demo = 0;
    (reviews || []).forEach((r) => {
      if (r.status === 'pending') {
        pending++;
      } else if (r.status === 'hidden' || (r as any).status === 'rejected') {
        hidden++;
      } else {
        approved++;
      }

      if (Array.isArray(r.photos) && r.photos.length > 0) {
        photos++;
      }
      if (r.isDemo) {
        demo++;
      }
    });
    return {
      all: (reviews || []).length,
      pending,
      approved,
      hidden,
      photos,
      demo,
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    return (reviews || []).filter((r) => {
      const cName = r.customerName || (r as any).userName || '';
      const matchesSearch =
        cName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.comment && r.comment.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.productName && r.productName.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === 'pending') {
        matchesStatus = r.status === 'pending';
      } else if (statusFilter === 'approved') {
        matchesStatus = r.status === 'approved' || (!r.status && !r.isDemo);
      } else if (statusFilter === 'hidden') {
        matchesStatus = r.status === 'hidden' || (r as any).status === 'rejected';
      } else if (statusFilter === 'photos') {
        matchesStatus = Array.isArray(r.photos) && r.photos.length > 0;
      } else if (statusFilter === 'demo') {
        matchesStatus = Boolean(r.isDemo);
      }

      return matchesSearch && matchesStatus;
    });
  }, [reviews, searchQuery, statusFilter]);

  // Load Google Drive Customer Reviews Folder Files
  const fetchDriveFolderFiles = async (token?: string) => {
    setIsLoadingFolderFiles(true);
    try {
      const activeToken = token || googleToken || (await getGoogleAccessToken()) || permanentKeyInput.trim() || '';
      if (!activeToken) return;
      const files = await listReviewFolderFiles(activeToken);
      if (Array.isArray(files)) {
        setFolderFiles(files);
      }
    } catch (err: any) {
      console.warn('[Fetch Drive Media Folder Notice]:', err?.message);
    } finally {
      setIsLoadingFolderFiles(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const handleCopyAppsScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setIsScriptCodeCopied(true);
    setTimeout(() => setIsScriptCodeCopied(false), 3000);
  };

  const handleSaveGasWebhook = () => {
    setIsSavingGasWebhook(true);
    try {
      localStorage.setItem('kenax_google_drive_webhook', gasWebhookUrl.trim());
      const rawGmail = localStorage.getItem('kenax_gmail_alert_settings');
      if (rawGmail) {
        try {
          const parsed = JSON.parse(rawGmail);
          parsed.webhookUrl = gasWebhookUrl.trim();
          localStorage.setItem('kenax_gmail_alert_settings', JSON.stringify(parsed));
        } catch {}
      }
      setDriveStatusMsg({
        type: 'success',
        text: '✅ Google Apps Script Webhook URL সফলভাবে সংরক্ষিত হয়েছে!',
      });
    } catch (e: any) {
      setDriveStatusMsg({ type: 'error', text: `সংরক্ষণে সমস্যা: ${e?.message}` });
    } finally {
      setIsSavingGasWebhook(false);
    }
  };

  const handleTestGasWebhook = async () => {
    if (!gasWebhookUrl.trim()) return;
    setIsTestingGasWebhook(true);
    setGasTestResult(null);
    try {
      const testBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const res = await fetch(gasWebhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'uploadReviewPhoto',
          filename: 'test_review_ping.jpg',
          mimeType: 'image/jpeg',
          base64Data: testBase64,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.success) {
          if (data.folderUrl) setFolderUrl(data.folderUrl);
          setGasTestResult({
            success: true,
            message: '🎉 অভিনন্দন! Google Drive Webhook সফলভাবে কানেক্ট হয়েছে এবং আপনার ড্রাইভে "Customer Reviews" ফোল্ডার তৈরি হয়েছে!',
            url: data.url,
            folderUrl: data.folderUrl,
          });
          fetchDriveFolderFiles();
        } else {
          setGasTestResult({
            success: false,
            message: `⚠️ গুগল ড্রাইভ স্ক্রিপ্ট ত্রুটি: ${data?.error || 'Unknown response'}`,
          });
        }
      } else {
        setGasTestResult({
          success: false,
          message: `⚠️ কানেকশন ব্যর্থ হয়েছে (HTTP Status: ${res.status})। নিশ্চিত করুন Web App Deployment Access "Anyone" দেওয়া আছে।`,
        });
      }
    } catch (err: any) {
      setGasTestResult({
        success: false,
        message: `সমস্যা: ${err?.message || 'Error communicating with Google Apps Script'}`,
      });
    } finally {
      setIsTestingGasWebhook(false);
    }
  };

  const handleSavePermanentKey = async () => {
    if (!permanentKeyInput.trim()) return;
    setIsSavingPermanentKey(true);
    try {
      await saveGoogleDrivePermanentKey(permanentKeyInput.trim(), currentStaff?.email || 'sadikrtx3060@gmail.com');
      setGoogleToken(permanentKeyInput.trim());
      setDriveStatusMsg({
        type: 'success',
        text: '✅ গুগল ড্রাইভ পার্মানেন্ট কি সংরক্ষিত হয়েছে!',
      });
      fetchDriveFolderFiles(permanentKeyInput.trim());
    } catch (err: any) {
      setDriveStatusMsg({
        type: 'error',
        text: `পার্মানেন্ট কি সংরক্ষণে সমস্যা: ${err?.message || 'Error'}`,
      });
    } finally {
      setIsSavingPermanentKey(false);
    }
  };

  const handleConnectGoogleDrive = async () => {
    setIsConnectingDrive(true);
    setDriveStatusMsg(null);
    try {
      const res = await signInWithGoogleDrive();
      setGoogleUser(res.user);
      setGoogleToken(res.accessToken);
      setDriveStatusMsg({
        type: 'success',
        text: `🎉 সফলভাবে Google Drive কানেক্ট হয়েছে! (${res.user.email})`,
      });
      fetchDriveFolderFiles(res.accessToken);
    } catch (err: any) {
      setDriveStatusMsg({
        type: 'error',
        text: `Google Drive কানেকশন ব্যর্থ: ${err.message || 'Error occurred'}`,
      });
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleUploadFileToGoogleDrive = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'demo' | 'edit' | 'gallery' = 'demo'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDrive(true);
    setUploadProgress(10);
    setDriveStatusMsg(null);

    try {
      let token = googleToken || (await getGoogleAccessToken()) || permanentKeyInput.trim() || undefined;
      let res: { url: string; fileId?: string; inDrive?: boolean; name?: string } | null = null;

      if (token) {
        try {
          const driveRes = await uploadFileToGoogleDrive(file, token, (percent) => {
            setUploadProgress(percent);
          });
          res = {
            url: driveRes.url,
            fileId: driveRes.fileId,
            inDrive: true,
            name: driveRes.name || file.name,
          };
        } catch (tokenErr) {
          console.warn('[Direct Drive Token Upload Error, trying Relay]:', tokenErr);
        }
      }

      if (!res) {
        const fileBuffer = await file.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);
        let binary = '';
        const len = fileBytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(fileBytes[i]);
        }
        const base64Data = btoa(binary);

        setUploadProgress(60);

        if (gasWebhookUrl && gasWebhookUrl.includes('script.google.com')) {
          const gasRes = await fetch(gasWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'uploadReviewPhoto',
              filename: file.name,
              mimeType: file.type || 'image/jpeg',
              base64Data,
            }),
          }).catch(() => null);

          if (gasRes && gasRes.ok) {
            const data = await gasRes.json().catch(() => null);
            if (data && data.url) {
              res = {
                url: data.url,
                fileId: data.fileId,
                inDrive: true,
                name: file.name,
              };
            }
          }
        }
      }

      if (!res) {
        const reader = new FileReader();
        const localDataUrl: string = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        res = {
          url: localDataUrl,
          inDrive: false,
          name: file.name,
        };
      }

      if (target === 'edit') {
        setEditPhotos((prev) => [...prev, res!.url]);
      } else if (target === 'demo') {
        setDemoPhotos((prev) => [...prev, res!.url]);
      }

      const newMediaItem = {
        id: res.fileId || `photo-${Date.now()}`,
        name: res.name || file.name,
        url: res.url,
        mimeType: file.type,
        createdTime: new Date().toISOString(),
      };

      setRecentUploadedPhotos((prev) => {
        const updated = [newMediaItem, ...prev.filter((p) => p.url !== res!.url)];
        try {
          localStorage.setItem('kenax_admin_uploaded_photos', JSON.stringify(updated.slice(0, 50)));
        } catch {}
        return updated;
      });

      setFolderFiles((prev) => [newMediaItem, ...prev.filter((p) => p.url !== res!.url)]);

      setDriveStatusMsg({
        type: 'success',
        text: `ফটো সফলভাবে আপলোড হয়েছে!`,
      });

      if (token) {
        fetchDriveFolderFiles(token);
      }
    } catch (err: any) {
      setDriveStatusMsg({
        type: 'error',
        text: `ছবি প্রসেসিংয়ে সমস্যা: ${err.message || 'Error'}`,
      });
    } finally {
      setIsUploadingDrive(false);
      setUploadProgress(0);
      if (e.target) e.target.value = '';
    }
  };

  const handleCreateDemoReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoProductId || !demoCustomerName.trim() || !demoComment.trim()) return;

    const selectedProd = products.find((p) => p.id === demoProductId);
    const newDemoRev: Review = {
      id: `rev-demo-${Date.now()}`,
      productId: demoProductId,
      productName: selectedProd?.name || 'Product',
      customerName: demoCustomerName.trim(),
      userName: demoCustomerName.trim(),
      rating: demoRating,
      comment: demoComment.trim(),
      photos: demoPhotos.filter((p) => p.trim() !== ''),
      status: 'approved',
      verifiedPurchase: demoVerified,
      isDemo: true,
      createdAt: new Date().toISOString(),
    };

    if (onAddDemoReview) {
      onAddDemoReview(newDemoRev);
    } else {
      onUpdateReview(newDemoRev);
    }

    setDemoCustomerName('');
    setDemoComment('');
    setDemoPhotos([]);
    setDemoPhotoInput('');
    setIsAddDemoOpen(false);
  };

  const handleStartEdit = (r: Review) => {
    setEditingReviewId(r.id);
    setEditComment(r.comment);
    setEditRating(r.rating);
    setEditPhotos(r.photos || []);
    setNewPhotoUrlInput('');
  };

  const handleSaveEdit = (r: Review) => {
    const updated: Review = {
      ...r,
      comment: editComment.trim() || r.comment,
      rating: editRating,
      photos: editPhotos,
    };
    onUpdateReview(updated);
    setEditingReviewId(null);
  };

  const handleAddEditPhotoUrl = () => {
    if (!newPhotoUrlInput.trim()) return;
    const resolved = resolveGoogleDriveUrl(newPhotoUrlInput.trim());
    setEditPhotos([...editPhotos, resolved]);
    setNewPhotoUrlInput('');
  };

  const handleRemovePhoto = (index: number) => {
    setEditPhotos(editPhotos.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* 1. TOP HEADER & QUICK TOOLBAR (Compact & SaaS-Grade) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0 font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                কাস্টমার রিভিউ মডারেশন
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-extrabold text-[11px]">
                {reviews.length}টি রিভিউ
              </span>
              {counts.pending > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] animate-pulse flex items-center gap-1">
                  <span>⏳ {counts.pending}টি পেন্ডিং</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              কাস্টমারদের মতামত যাচাই, অনুমোদন এবং Google Drive সরাসরি ইমেজ সিঙ্ক
            </p>
          </div>
        </div>

        {/* Quick Toolbar Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsDriveSettingsOpen((prev) => !prev);
              setIsMediaGalleryOpen(false);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isDriveSettingsOpen
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-purple-500" />
            <span>Google Drive সিঙ্ক</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isDriveSettingsOpen ? 'rotate-180' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsMediaGalleryOpen((prev) => !prev);
              setIsDriveSettingsOpen(false);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isMediaGalleryOpen
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
            <span>ফটো গ্যালারি ({customerUploadedPhotos.length + driveAndUploadedMedia.length})</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isMediaGalleryOpen ? 'rotate-180' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsAddDemoOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
          >
            <span>+ ডেমো রিভিউ</span>
          </button>
        </div>
      </div>

      {/* 2. COLLAPSIBLE GOOGLE DRIVE & APPS SCRIPT SETTINGS DRAWER */}
      {isDriveSettingsOpen && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-50/80 via-white to-slate-50 dark:from-purple-950/30 dark:via-slate-900 dark:to-slate-900 border border-purple-200 dark:border-purple-800/80 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 dark:border-purple-800/60 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                Google Drive ও Apps Script ক্লাউড কনফিগারেশন
              </h3>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setActiveSettingsTab('script')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeSettingsTab === 'script'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Apps Script Webhook
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab('key')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeSettingsTab === 'key'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Drive API Key
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab('auth')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeSettingsTab === 'auth'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                OAuth Sign-In
              </button>
            </div>
          </div>

          {/* Tab 1: Google Apps Script Webhook (Recommended) */}
          {activeSettingsTab === 'script' && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                💡 কাস্টমাররা রিভিউ ছবি আপলোড করলে এই স্ক্রিপ্ট স্বয়ংক্রিয়ভাবে আপনার Google Drive-এর <b>"Customer Reviews"</b> ফোল্ডারে ছবিটি সেভ করবে এবং পার্মানেন্ট লিংক দেবে।
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="url"
                  value={gasWebhookUrl}
                  onChange={(e) => setGasWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono focus:border-purple-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleSaveGasWebhook}
                  disabled={isSavingGasWebhook || !gasWebhookUrl.trim()}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>সেভ</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestGasWebhook}
                  disabled={isTestingGasWebhook || !gasWebhookUrl.trim()}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isTestingGasWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>টেস্ট ড্রাইভ ফোল্ডার</span>
                </button>
              </div>

              {gasTestResult && (
                <div
                  className={`p-2.5 rounded-xl text-[11px] font-bold flex items-center gap-2 ${
                    gasTestResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/70 border border-rose-200 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {gasTestResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                  <span className="flex-1">{gasTestResult.message}</span>
                  <button type="button" onClick={() => setGasTestResult(null)} className="text-slate-400 px-1 cursor-pointer">✕</button>
                </div>
              )}

              {/* Code Snippet Box */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">Google Apps Script Code (Reviews + Drive + Gmail)</span>
                  <button
                    type="button"
                    onClick={handleCopyAppsScript}
                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer"
                  >
                    {isScriptCodeCopied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    <span>{isScriptCodeCopied ? 'কপি হয়েছে!' : '১-ক্লিকে কোড কপি'}</span>
                  </button>
                </div>
                <pre className="p-2 bg-slate-900 rounded-lg font-mono text-[10px] text-emerald-400 overflow-x-auto max-h-32 scrollbar-thin">
                  {APPS_SCRIPT_CODE}
                </pre>
              </div>
            </div>
          )}

          {/* Tab 2: Permanent Key */}
          {activeSettingsTab === 'key' && (
            <div className="space-y-2 text-xs">
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Google Cloud Console থেকে পাওয়া <b>Google Drive API Key</b> এখানে সেভ করতে পারেন:
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="password"
                  value={permanentKeyInput}
                  onChange={(e) => setPermanentKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-700 bg-white dark:bg-slate-800 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleSavePermanentKey}
                  disabled={isSavingPermanentKey || !permanentKeyInput.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer"
                >
                  সেভ কি
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: OAuth Sign-In */}
          {activeSettingsTab === 'auth' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-slate-900 dark:text-white">স্ট্যাটাস: </span>
                {googleUser ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">কানেক্টেড ({googleUser.email})</span>
                ) : (
                  <span className="text-slate-500 font-medium">কানেক্টেড নয়</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleConnectGoogleDrive()}
                disabled={isConnectingDrive}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isConnectingDrive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                <span>{googleUser ? 'অ্যাকাউন্ট পরিবর্তন' : 'Google Sign-In'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. COLLAPSIBLE MEDIA GALLERY DRAWER */}
      {isMediaGalleryOpen && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 shadow-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                মিডিয়া ও কাস্টমার ফটো এক্সপ্লোরার
              </h3>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setGalleryTab('all')}
                className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                  galleryTab === 'all' ? 'bg-white dark:bg-slate-900 text-indigo-600 font-black shadow-2xs' : 'text-slate-500'
                }`}
              >
                সকল ({customerUploadedPhotos.length + driveAndUploadedMedia.length})
              </button>
              <button
                type="button"
                onClick={() => setGalleryTab('customer')}
                className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                  galleryTab === 'customer' ? 'bg-white dark:bg-slate-900 text-emerald-600 font-black shadow-2xs' : 'text-slate-500'
                }`}
              >
                কাস্টমার ({customerUploadedPhotos.length})
              </button>
              <button
                type="button"
                onClick={() => setGalleryTab('drive')}
                className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                  galleryTab === 'drive' ? 'bg-white dark:bg-slate-900 text-purple-600 font-black shadow-2xs' : 'text-slate-500'
                }`}
              >
                ড্রাইভ ({driveAndUploadedMedia.length})
              </button>
            </div>
          </div>

          {/* Media Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 max-h-56 overflow-y-auto p-1">
            {displayedMediaList.map((item, idx) => (
              <div
                key={idx}
                className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
              >
                <img
                  src={getDriveDirectImageUrl(item.url)}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => handleImageErrorFallback(e, item.url)}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-1">
                  <button
                    type="button"
                    onClick={() => setPreviewModalUrl(item.url)}
                    className="p-1 rounded-md bg-white/30 hover:bg-white/50 text-white text-[10px]"
                    title="Zoom"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(item.url)}
                    className="p-1 rounded-md bg-purple-600 text-white text-[10px]"
                    title="Copy Link"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. COMPACT SEGMENTED FILTER BAR & SEARCH (Responsive on Mobile & Desktop) */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        {/* Horizontal Scrollable Tabs on Mobile, Flex on Desktop */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none sm:flex-wrap">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              statusFilter === 'all'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span>🌟 সকল</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
            }`}
          >
            <span className="flex items-center gap-1">
              {counts.pending > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping inline-block" />}
              <span>⏳ পেন্ডিং</span>
            </span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              statusFilter === 'pending' ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
            }`}>
              {counts.pending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
            }`}
          >
            <span>✅ অনুমোদিত</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              statusFilter === 'approved' ? 'bg-white/20 text-white' : 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200'
            }`}>
              {counts.approved}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('hidden')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              statusFilter === 'hidden'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span>👁️‍🗨️ হাইড</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              statusFilter === 'hidden' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {counts.hidden}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('photos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              statusFilter === 'photos'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60'
            }`}
          >
            <span>📷 ছবিসহ</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              statusFilter === 'photos' ? 'bg-white/20 text-white' : 'bg-sky-200 dark:bg-sky-900 text-sky-900 dark:text-sky-200'
            }`}>
              {counts.photos}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('demo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              statusFilter === 'demo'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
            }`}
          >
            <span>✨ ডেমো</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              statusFilter === 'demo' ? 'bg-white/20 text-white' : 'bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200'
            }`}>
              {counts.demo}
            </span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="কাস্টমারের নাম, প্রোডাক্ট বা মন্তব্য লিখে খুঁজুন..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white dark:bg-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-500"
          />
        </div>
      </div>

      {/* 5. ADD DEMO REVIEW MODAL */}
      {isAddDemoOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-md w-full space-y-3.5 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                <span>নতুন ডেমো রিভিউ তৈরি</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddDemoOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDemoReview} className="space-y-3">
              {/* Product Selector */}
              <div className="relative" ref={productDropdownRef}>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  সিলেক্ট প্রোডাক্ট *
                </label>
                {selectedProductObj && (
                  <div className="mb-1.5 p-2 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white truncate">{selectedProductObj.name}</span>
                    <span className="font-black text-purple-600 shrink-0">৳{selectedProductObj.price}</span>
                  </div>
                )}
                <input
                  type="text"
                  value={productSearchTerm}
                  onChange={(e) => {
                    setProductSearchTerm(e.target.value);
                    setIsProductDropdownOpen(true);
                  }}
                  onFocus={() => setIsProductDropdownOpen(true)}
                  placeholder="প্রোডাক্ট খুঁজুন..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                {isProductDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredProductsForSelect.slice(0, 15).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setDemoProductId(p.id);
                          setIsProductDropdownOpen(false);
                        }}
                        className="w-full p-2 text-left hover:bg-purple-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="font-bold text-purple-600">৳{p.price}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reviewer Name */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ক্রেতার নাম *</label>
                <input
                  type="text"
                  value={demoCustomerName}
                  onChange={(e) => setDemoCustomerName(e.target.value)}
                  placeholder="e.g. তানভীর আহমেদ"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              {/* Rating */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">রেটিং (১ - ৫ স্টার)</label>
                <div className="flex items-center gap-1 text-amber-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setDemoRating(star)}
                      className="p-1 cursor-pointer"
                    >
                      <Star className={`w-5 h-5 ${star <= demoRating ? 'fill-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-slate-700 dark:text-slate-300">{demoRating} Stars</span>
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">রিভিউ মন্তব্য *</label>
                <textarea
                  rows={2}
                  value={demoComment}
                  onChange={(e) => setDemoComment(e.target.value)}
                  placeholder="প্রোডাক্টের কোয়ালিটি খুবই ভালো..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              {/* Photo Attachment */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ছবি সংযুক্ত করুন (অপশনাল)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="url"
                    value={demoPhotoInput}
                    onChange={(e) => setDemoPhotoInput(e.target.value)}
                    placeholder="গুগল ড্রাইভ বা ইমেজ লিংক..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (demoPhotoInput.trim()) {
                        setDemoPhotos((prev) => [...prev, resolveGoogleDriveUrl(demoPhotoInput.trim())]);
                        setDemoPhotoInput('');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold cursor-pointer"
                  >
                    + যোগ
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-white font-bold cursor-pointer"
                  >
                    আপলোড
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadFileToGoogleDrive(e, 'demo')}
                    className="hidden"
                  />
                </div>

                {demoPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {demoPhotos.map((p, idx) => (
                      <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200">
                        <img src={getDriveDirectImageUrl(p)} alt="Thumb" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setDemoPhotos(demoPhotos.filter((_, i) => i !== idx))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddDemoOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-xs"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. REVIEWS LIST (Ultra-Clean, Compact Grid on Mobile & Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {filteredReviews.map((r) => {
          const customerName = r.customerName || (r as any).userName || 'Valued Customer';
          const isApproved = r.status === 'approved' || (!r.status && !r.isDemo);
          const isPending = r.status === 'pending';
          const isHidden = r.status === 'hidden' || (r as any).status === 'rejected';
          const isEditing = editingReviewId === r.id;

          return (
            <div
              key={r.id}
              className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between space-y-3 ${
                isPending
                  ? 'border-amber-300 dark:border-amber-800/80 shadow-xs ring-1 ring-amber-400/20'
                  : 'border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="space-y-2">
                {/* Header info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-black text-xs flex items-center justify-center shrink-0">
                      {customerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[130px]">
                          {customerName}
                        </span>
                        {r.verifiedPurchase && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold" title="Verified Buyer">
                            ✓
                          </span>
                        )}
                        {r.isDemo && (
                          <span className="px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-[9px] font-bold">
                            ডেমো
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-amber-400 mt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${s <= (isEditing ? editRating : r.rating) ? 'fill-amber-400' : 'text-slate-200 dark:text-slate-700'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                      isPending
                        ? 'bg-amber-100 dark:bg-amber-950/90 text-amber-900 dark:text-amber-200 border border-amber-300'
                        : isApproved
                        ? 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300'
                    }`}
                  >
                    {isPending ? '⏳ পেন্ডিং' : isApproved ? '✅ লাইভ' : '👁️‍🗨️ হাইড'}
                  </span>
                </div>

                {/* Product & Date tag */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-purple-700 dark:text-purple-400 truncate max-w-[170px]">
                    {r.productName || 'Product'}
                  </span>
                  <span>
                    {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                {/* Body / Edit Mode */}
                {isEditing ? (
                  <div className="space-y-2 p-2.5 rounded-xl bg-purple-50/60 dark:bg-slate-800/80 border border-purple-200 text-xs">
                    <textarea
                      rows={2}
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="url"
                        placeholder="Add photo link..."
                        value={newPhotoUrlInput}
                        onChange={(e) => setNewPhotoUrlInput(e.target.value)}
                        className="flex-1 px-2 py-1 rounded-lg border border-slate-300 text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={handleAddEditPhotoUrl}
                        className="px-2 py-1 rounded-lg bg-purple-600 text-white text-[11px] font-bold"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingReviewId(null)}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 text-[11px] font-bold"
                      >
                        বাতিল
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(r)}
                        className="px-3 py-1 rounded-lg bg-purple-600 text-white text-[11px] font-black"
                      >
                        সেভ
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 italic">
                      "{r.comment}"
                    </p>

                    {/* Customer Photos */}
                    {r.photos && r.photos.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {r.photos.map((photo, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setPreviewModalUrl(photo)}
                            className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform block bg-slate-100 shrink-0 cursor-pointer shadow-2xs"
                            title="বড় করে দেখতে ক্লিক করুন"
                          >
                            <img
                              src={getDriveDirectImageUrl(photo)}
                              alt="Review attachment"
                              className="w-full h-full object-cover"
                              onError={(e) => handleImageErrorFallback(e, photo)}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Action Buttons Footer */}
              {!isEditing && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    {isPending ? (
                      <button
                        type="button"
                        onClick={() => onApproveReview(r.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="অনুমোদন করুন (Approve)"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>অনুমোদন</span>
                      </button>
                    ) : isApproved ? (
                      <button
                        type="button"
                        onClick={() => onHideReview(r.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                        title="হাইড করুন (Hide)"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>হাইড</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onApproveReview(r.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                        title="পুনরায় সক্রিয় করুন"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>লাইভ করুন</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleStartEdit(r)}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800 cursor-pointer"
                      title="সম্পাদনা করুন (Edit)"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteReview(r.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer"
                    title="স্থায়ীভাবে মুছুন (Delete)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filteredReviews.length === 0 && (
          <div className="col-span-full py-10 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            এই ফিল্টারে কোনো কাস্টমার রিভিউ পাওয়া যায়নি।
          </div>
        )}
      </div>

      {/* 7. FULL RESOLUTION IMAGE PREVIEW MODAL */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-w-2xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-2 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                ছবি প্রিভিউ (Full Resolution Preview)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyLink(previewModalUrl)}
                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>লিংক কপি</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModalUrl(null)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-2 flex items-center justify-center overflow-auto max-h-[70vh]">
              <img
                src={getDriveDirectImageUrl(previewModalUrl)}
                alt="Full resolution preview"
                className="max-w-full max-h-[65vh] object-contain rounded-xl"
                onError={(e) => handleImageErrorFallback(e, previewModalUrl)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
