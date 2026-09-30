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
            name: `${r.customerName || r.userName || 'Customer'} (${r.productName || 'Review'})`,
            url: directUrl,
            createdTime: r.createdAt,
            customerName: r.customerName || r.userName || 'Customer',
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
    // 'all': Combine customer review photos + drive/uploaded photos without duplicate URLs
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

  // URL Converter & Live Link Resolver State
  const [converterInput, setConverterInput] = useState('');
  const [resolvedConverterUrl, setResolvedConverterUrl] = useState('');

  // Permanent Key (Google App Password / API Key style) state
  const [permanentKeyInput, setPermanentKeyInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kenax_google_drive_permanent_key') || '';
    }
    return '';
  });
  const [isSavingPermanentKey, setIsSavingPermanentKey] = useState(false);
  const [showPermanentKeyInput, setShowPermanentKeyInput] = useState(false);

  const handleSavePermanentKey = async () => {
    if (!permanentKeyInput.trim()) return;
    setIsSavingPermanentKey(true);
    try {
      await saveGoogleDrivePermanentKey(permanentKeyInput.trim(), currentStaff?.email || 'sadikrtx3060@gmail.com');
      setGoogleToken(permanentKeyInput.trim());
      setDriveStatusMsg({
        type: 'success',
        text: '✅ গুগল ড্রাইভ পার্মানেন্ট কি সফলভাবে সংরক্ষিত হয়েছে! অফলাইন-অনলাইন যাই হোক না কেন এটি ক্লাউড ও ডিভাইসে স্থায়ীভাবে কানেক্টেড থাকবে।',
      });
      fetchDriveFolderFiles(permanentKeyInput.trim());
      setShowPermanentKeyInput(false);
    } catch (err: any) {
      setDriveStatusMsg({
        type: 'error',
        text: `পার্মানেন্ট কি সংরক্ষণে সমস্যা: ${err?.message || 'Error'}`,
      });
    } finally {
      setIsSavingPermanentKey(false);
    }
  };

  // Auto-resolve Google Drive Link when pasted into converter
  useEffect(() => {
    if (!converterInput.trim()) {
      setResolvedConverterUrl('');
      return;
    }
    const resolved = resolveGoogleDriveUrl(converterInput);
    setResolvedConverterUrl(resolved);
  }, [converterInput]);

  // Load Google Drive Customer Reviews Folder Files
  const fetchDriveFolderFiles = async (token?: string) => {
    setIsLoadingFolderFiles(true);
    try {
      const res = await fetch('/api/drive/customer-reviews');
      if (res.ok) {
        const data = await res.json();
        if (data.files) {
          setFolderFiles(data.files);
        }
        if (data.folderUrl) {
          setFolderUrl(data.folderUrl);
        }
      } else if (token || googleToken) {
        const activeTok = token || googleToken;
        if (activeTok) {
          const directFiles = await listReviewFolderFiles(activeTok);
          setFolderFiles(directFiles as any);
        }
      }
    } catch (err) {
      console.warn('[Fetch Drive Reviews Error]:', err);
    } finally {
      setIsLoadingFolderFiles(false);
    }
  };

  // Initialize Google Auth state listener
  useEffect(() => {
    getGoogleAccessToken().then((tok) => {
      if (tok) {
        setGoogleToken(tok);
        fetchDriveFolderFiles(tok);
      } else {
        fetchDriveFolderFiles();
      }
    });

    const unsub = initGoogleDriveAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
        fetchDriveFolderFiles(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsub();
  }, []);

  // Close product search dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(e.target as Node)
      ) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Connect with Google Drive
  const handleConnectGoogleDrive = async (forceReconnect = false): Promise<string | null> => {
    if (googleToken && !forceReconnect) return googleToken;
    setIsConnectingDrive(true);
    setDriveStatusMsg(null);
    try {
      const res = await signInWithGoogleDrive();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        setDriveStatusMsg({
          type: 'success',
          text: `Google Drive সফলভাবে সংযুক্ত হয়েছে (${res.user.email || 'Admin'})`,
        });
        fetchDriveFolderFiles(res.accessToken);
        return res.accessToken;
      }
      return null;
    } catch (err: any) {
      setDriveStatusMsg({
        type: 'error',
        text: `Google Drive কানেক্ট করতে ব্যর্থ: ${err.message || 'Error'}`,
      });
      return null;
    } finally {
      setIsConnectingDrive(false);
    }
  };

  // Upload file from device directly to Google Drive "Customer Reviews" folder
  const handleUploadFileToGoogleDrive = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'demo' | 'edit' | 'gallery' = 'demo'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDrive(true);
    setUploadProgress(15);
    setDriveStatusMsg(null);

    try {
      let token = googleToken;
      if (!token) {
        token = await getGoogleAccessToken();
      }

      setUploadProgress(40);
      let res: { fileId: string; url: string; name: string } | null = null;
      try {
        if (token) {
          res = await uploadFileToGoogleDrive(file, token, (percent) => {
            setUploadProgress(percent);
          });
        }
      } catch (uploadErr) {
        console.warn('[Admin Drive Upload Error, fallback to reader]:', uploadErr);
      }

      // If direct Google Drive token wasn't active or threw error, use instant Data URL reader
      if (!res || !res.url) {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve((ev.target?.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });

        res = {
          fileId: `local-${Date.now()}`,
          url: dataUrl,
          name: file.name,
        };
      }

      // Add to appropriate target form
      if (target === 'edit') {
        setEditPhotos((prev) => [...prev, res!.url]);
      } else if (target === 'demo') {
        setDemoPhotos((prev) => [...prev, res!.url]);
      }

      // Always save to recentUploadedPhotos & folderFiles so it shows immediately in the gallery below!
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
        text: `ফটো সফলভাবে আপলোড হয়েছে এবং নিচের মিডিয়া গ্যালারিতে যুক্ত করা হয়েছে!`,
      });

      // Refresh drive folder files in background
      if (token) {
        fetchDriveFolderFiles(token);
      }
    } catch (err: any) {
      console.warn('[Upload Handler Notice]:', err);
      setDriveStatusMsg({
        type: 'error',
        text: `ছবি প্রসেসিংয়ে সমস্যা হয়েছে: ${err.message || 'Error'}`,
      });
    } finally {
      setIsUploadingDrive(false);
      setUploadProgress(0);
      if (e.target) e.target.value = '';
    }
  };

  // Helper to resolve and add photo URL to demo review
  const handleAddDemoPhotoUrl = (urlToAdd?: string) => {
    const raw = (urlToAdd || demoPhotoInput).trim();
    if (!raw) return;
    const resolved = resolveGoogleDriveUrl(raw);
    setDemoPhotos((prev) => [...prev, resolved]);
    setDemoPhotoInput('');
    setDriveStatusMsg({
      type: 'success',
      text: 'ছবি সফলভাবে যুক্ত হয়েছে এবং সরাসরি গুগল ড্রাইভ থেকে লোড হবে!',
    });
  };

  // Copy helper
  const handleCopyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  // Filtered products for product search selector
  const filteredProductsForSelect = products.filter((p) => {
    if (!productSearchTerm.trim()) return true;
    const term = productSearchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.sku && p.sku.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term))
    );
  });

  const selectedProductObj = products.find((p) => p.id === demoProductId) || products[0];

  // Editing state
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [newPhotoUrlInput, setNewPhotoUrlInput] = useState('');

  const filteredReviews = reviews.filter((r) => {
    const cName = r.customerName || (r as any).userName || '';
    const matchesSearch =
      cName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.productName && r.productName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'approved' && r.status === 'approved') ||
      (statusFilter === 'pending' && r.status === 'pending') ||
      (statusFilter === 'hidden' && r.status === 'hidden') ||
      (statusFilter === 'demo' && r.isDemo);

    return matchesSearch && matchesStatus;
  });

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

    // Reset modal
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
    <div className="space-y-6">
      {/* 1. Google Drive Customer Reviews Sync & Storage Dashboard */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-purple-900/10 via-white to-sky-50 dark:from-purple-950/40 dark:via-slate-900 dark:to-slate-900 border border-purple-200/80 dark:border-purple-800/60 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                  Google Drive কাস্টমার রিভিউ ফোল্ডার ও সিঙ্ক
                </h3>
                {googleUser || googleToken ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[11px] font-extrabold border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>কানেক্টেড: {googleUser?.email || 'Admin Drive'}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[11px] font-extrabold border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>ড্রাইভ কানেক্ট করুন</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                কাস্টমাররা যে ফটো রিভিউ দিবে, তা স্বয়ংক্রিয়ভাবে আপনার গুগল ড্রাইভের <b>"Customer Reviews"</b> ফোল্ডারে আপলোড হয়ে পাবলিক ভিউয়ার হিসেবে সেভ হবে এবং প্রতিবার ড্রাইভ সিডিএন থেকে দ্রুত লোড হবে।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {folderUrl && (
              <a
                href={folderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <Folder className="w-4 h-4 text-purple-600" />
                <span>ড্রাইভ ফোল্ডার খুলুন</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              type="button"
              onClick={() => setShowPermanentKeyInput((prev) => !prev)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Google App Password / Permanent API Key"
            >
              <Key className="w-4 h-4" />
              <span>{permanentKeyInput ? '🔑 স্থায়ী কি কনফিগার করা' : '🔑 অ্যাপ পাসওয়ার্ড / স্থায়ী কি'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleConnectGoogleDrive(true)}
              disabled={isConnectingDrive}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isConnectingDrive ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4" />
              )}
              <span>{googleUser ? 'ড্রাইভ রিলোড / পরিবর্তন' : 'Google Drive সাইন-ইন'}</span>
            </button>

            <button
              type="button"
              onClick={() => directDriveUploadRef.current?.click()}
              disabled={isUploadingDrive}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <FolderUp className="w-4 h-4" />
              <span>Drive-এ ছবি আপলোড</span>
            </button>
            <input
              ref={directDriveUploadRef}
              type="file"
              accept="image/*,video/*"
              onChange={(e) => handleUploadFileToGoogleDrive(e, 'gallery')}
              className="hidden"
            />
          </div>
        </div>

        {/* Permanent App Key / API Key Configuration Drawer */}
        {showPermanentKeyInput && (
          <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  গুগল ড্রাইভ পার্মানেন্ট কানেকশন (গুগল অ্যাপ পাসওয়ার্ড / এপিআই কি সিস্টেম)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowPermanentKeyInput(false)}
                className="text-amber-700 hover:text-amber-900 dark:text-amber-400 text-xs font-bold px-1.5 py-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
              গুগল অ্যাপ পাসওয়ার্ডের মতোই একবার আপনার Google Drive API Key, OAuth Refresh Token বা Permanent Token এখানে দিয়ে সেভ করলে ব্রাউজার রিফ্রেশ দিলে কিংবা অফলাইন থেকে অনলাইনে আসলেও ড্রাইভ আর বারবার ডিসকানেক্ট হবে না। এটি ক্লাউড ও ডিভাইসে স্থায়ীভাবে সেভ থাকবে।
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="password"
                value={permanentKeyInput}
                onChange={(e) => setPermanentKeyInput(e.target.value)}
                placeholder="Paste Google Drive Permanent Token / API Key / Service Key here (e.g. AIzaSy...)"
                className="flex-1 px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono focus:border-amber-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleSavePermanentKey}
                disabled={isSavingPermanentKey || !permanentKeyInput.trim()}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingPermanentKey ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>স্থায়ীভাবে সেভ করুন</span>
              </button>
            </div>

            {/* Quick 2-Minute Tutorial Card */}
            <div className="mt-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 space-y-2 text-[11px]">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>কীভাবে ২ মিনিটে Google Drive API Key পাবেন? (খুবই সহজ নিয়ম)</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 leading-relaxed pl-1">
                <li>
                  <a
                    href="https://console.cloud.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-700 dark:text-amber-400 font-bold underline inline-flex items-center gap-0.5"
                  >
                    Google Cloud Console <ExternalLink className="w-3 h-3 inline" />
                  </a>{' '}
                  -এ যান (আপনার সাধারণ জিমেইল দিয়ে ফ্রি লগইন করুন)।
                </li>
                <li>
                  উপরে প্রোজেক্ট সিলেক্ট ড্রপডাউন থেকে <b>"New Project"</b> বানিয়ে নিন (নাম দিন: <i>KenaX Drive</i>)।
                </li>
                <li>
                  বাম পাশের মেনু থেকে <b>"APIs & Services" &gt; "Library"</b>-তে যান এবং <b>"Google Drive API"</b> সার্চ করে <b>Enable</b> করুন।
                </li>
                <li>
                  এবার <b>"APIs & Services" &gt; "Credentials"</b>-এ গিয়ে উপরে <b>"+ CREATE CREDENTIALS" &gt; "API key"</b>-তে ক্লিক করুন।
                </li>
                <li>
                  একটি চাবি/কি তৈরি হবে (যেমন: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-amber-600 font-mono">AIzaSy...</code>)। সেটি কপি করে উপরের বক্সে পেস্ট করে <b>"স্থায়ীভাবে সেভ করুন"</b> বাটনে চাপ দিন। ব্যস, স্থায়ী কানেকশন রেডি!
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Drive Status Alert */}
        {driveStatusMsg && (
          <div
            className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
              driveStatusMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {driveStatusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="flex-1">{driveStatusMsg.text}</span>
            <button
              type="button"
              onClick={() => setDriveStatusMsg(null)}
              className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Upload progress indicator */}
        {isUploadingDrive && (
          <div className="space-y-1.5 p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between text-xs text-purple-900 dark:text-purple-200 font-bold">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                Google Drive "Customer Reviews" ফোল্ডারে আপলোড হচ্ছে...
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-purple-200 dark:bg-purple-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Google Drive Link Auto-Resolver & Converter Tool */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
              <Link2 className="w-4 h-4 text-purple-600" />
              <span>গুগল ড্রাইভ ফটো লিংক অটো-কনভার্টার (Direct Drive Image Link Converter)</span>
            </div>
            <span className="text-[11px] text-slate-400">যে কোনো গুগল ড্রাইভ লিংক পেস্ট করুন</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={converterInput}
              onChange={(e) => setConverterInput(e.target.value)}
              placeholder="Paste any Google Drive link (e.g. https://drive.google.com/file/d/1aB2c.../view?usp=sharing)"
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white dark:bg-slate-900 focus:border-purple-500 focus:outline-hidden"
            />
            {converterInput && (
              <button
                type="button"
                onClick={() => setConverterInput('')}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Resolved Result Preview */}
          {resolvedConverterUrl && (
            <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-purple-300 shrink-0 shadow-2xs">
                  <img
                    src={getDriveDirectImageUrl(resolvedConverterUrl)}
                    alt="Resolved preview"
                    className="w-full h-full object-cover"
                    onError={(e) => handleImageErrorFallback(e, resolvedConverterUrl)}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>রেডি! সরাসরি সিডিএন ইমেজ ইউআরএল (Permanent CDN Link):</span>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-mono truncate max-w-md">
                    {resolvedConverterUrl}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyLink(resolvedConverterUrl)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  {copiedUrl === resolvedConverterUrl ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedUrl === resolvedConverterUrl ? 'কপি হয়েছে!' : 'লিংক কপি'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDemoPhotos((prev) => [...prev, resolvedConverterUrl]);
                    setIsAddDemoOpen(true);
                    setConverterInput('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <span>+ ডেমো রিভিউতে যোগ</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Complete Interactive Media & Customer Photos Gallery */}
        <div className="space-y-3 pt-3 border-t border-purple-200/60 dark:border-purple-800/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>মিডিয়া ও কাস্টমার ফটো গ্যালারি</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                কাস্টমারদের ছবি: {customerUploadedPhotos.length}টি
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 text-[10px] font-bold border border-purple-200 dark:border-purple-800">
                ড্রাইভ ও রিসেন্ট: {driveAndUploadedMedia.length}টি
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Tab Filters */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setGalleryTab('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    galleryTab === 'all'
                      ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  সকল ({customerUploadedPhotos.length + driveAndUploadedMedia.length})
                </button>
                <button
                  type="button"
                  onClick={() => setGalleryTab('customer')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    galleryTab === 'customer'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  কাস্টমার রিভিউ ({customerUploadedPhotos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setGalleryTab('drive')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    galleryTab === 'drive'
                      ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-2xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  ড্রাইভ/আপলোড ({driveAndUploadedMedia.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => fetchDriveFolderFiles()}
                disabled={isLoadingFolderFiles}
                className="text-[11px] text-purple-700 dark:text-purple-400 font-bold hover:underline flex items-center gap-1 cursor-pointer ml-1"
                title="Refresh media"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingFolderFiles ? 'animate-spin' : ''}`} />
                <span>রিফ্রেশ</span>
              </button>
            </div>
          </div>

          {displayedMediaList.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
              <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {galleryTab === 'customer'
                  ? 'কাস্টমারদের কোনো আপলোড করা ছবি এখনও পাওয়া যায়নি।'
                  : 'গ্যালারিতে এখনও কোনো ফটো নেই। উপরের "Drive-এ ছবি আপলোড" বাটনে ক্লিক করে সরাসরি ছবি যুক্ত করতে পারেন।'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {displayedMediaList.slice(0, 32).map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 aspect-square shadow-2xs hover:border-purple-500 transition-all cursor-pointer"
                >
                  <img
                    src={getDriveDirectImageUrl(item.url)}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                    onError={(e) => handleImageErrorFallback(e, item.url)}
                  />

                  {/* Badge on Card */}
                  <div className="absolute top-1 left-1 pointer-events-none">
                    {item.isCustomer ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-600/90 text-white text-[8px] font-bold shadow-xs">
                        কাস্টমার
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-md bg-purple-600/90 text-white text-[8px] font-bold shadow-xs">
                        ড্রাইভ
                      </span>
                    )}
                  </div>

                  {/* Action Overlay */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 text-white">
                    <span className="text-[9px] font-bold truncate" title={item.name}>
                      {item.customerName || item.name}
                    </span>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewModalUrl(item.url);
                        }}
                        className="p-1 rounded-lg bg-white/20 hover:bg-white/40 text-white text-[10px] font-bold cursor-pointer"
                        title="Zoom / View full photo"
                      >
                        <ZoomIn className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(item.url);
                        }}
                        className="p-1 rounded-lg bg-white/20 hover:bg-white/40 text-white text-[10px] font-bold cursor-pointer"
                        title="Copy direct image link"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDemoPhotos((prev) => [...prev, item.url]);
                          setIsAddDemoOpen(true);
                        }}
                        className="p-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold cursor-pointer"
                        title="Add to new demo review"
                      >
                        + যোগ
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Header & Filter */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviews by customer name or keywords..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white dark:bg-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 cursor-pointer"
          >
            <option value="all">All Reviews ({reviews.length})</option>
            <option value="pending">Pending Moderation</option>
            <option value="approved">Approved & Public</option>
            <option value="hidden">Hidden</option>
            <option value="demo">Demo Reviews</option>
          </select>

          <button
            type="button"
            onClick={() => setIsAddDemoOpen(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <span>+ Add Demo Review</span>
          </button>
        </div>
      </div>

      {/* Add Demo Review Modal */}
      {isAddDemoOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span>Add Demo Review</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Demo reviews appear on product pages naturally like authentic customer feedback.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDemoOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDemoReview} className="space-y-4 text-xs">
              {/* 1. Searchable Product Selector */}
              <div className="relative" ref={productDropdownRef}>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>সিলেক্ট প্রোডাক্ট (Select Product) *</span>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                    {products.length}টি প্রোডাক্ট উপলব্ধ
                  </span>
                </label>

                {/* Selected Product Highlight Card */}
                {selectedProductObj && (
                  <div className="mb-2 p-2.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 shrink-0">
                        <img
                          src={selectedProductObj.image || selectedProductObj.images?.[0] || 'https://via.placeholder.com/80'}
                          alt={selectedProductObj.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-slate-900 dark:text-white truncate text-xs">
                          {selectedProductObj.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                          <span className="font-black text-purple-700 dark:text-purple-300">৳{selectedProductObj.price}</span>
                          {selectedProductObj.sku && <span>• SKU: {selectedProductObj.sku}</span>}
                          {selectedProductObj.category && (
                            <span className="px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold">
                              {selectedProductObj.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-bold text-[11px] hover:bg-purple-100 dark:hover:bg-purple-900/40 cursor-pointer shrink-0"
                    >
                      {isProductDropdownOpen ? 'বন্ধ করুন' : 'পরিবর্তন'}
                    </button>
                  </div>
                )}

                {/* Search Bar Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => {
                      setProductSearchTerm(e.target.value);
                      setIsProductDropdownOpen(true);
                    }}
                    onFocus={() => setIsProductDropdownOpen(true)}
                    placeholder="প্রোডাক্টের নাম, SKU বা ক্যাটাগরি লিখে খুঁজুন..."
                    className="w-full pl-8.5 pr-8 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:border-purple-500 focus:outline-hidden"
                  />
                  {productSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setProductSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Dropdown Results */}
                {isProductDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredProductsForSelect.length > 0 ? (
                      filteredProductsForSelect.map((p) => {
                        const isSelected = p.id === demoProductId;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setDemoProductId(p.id);
                              setIsProductDropdownOpen(false);
                              setProductSearchTerm('');
                            }}
                            className={`w-full text-left p-2.5 flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                                <img
                                  src={p.image || p.images?.[0] || 'https://via.placeholder.com/80'}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-xs truncate">{p.name}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                  <span className="font-black text-purple-600 dark:text-purple-400">৳{p.price}</span>
                                  {p.sku && <span>SKU: {p.sku}</span>}
                                  {p.category && <span className="opacity-80">({p.category})</span>}
                                </div>
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-slate-400 text-xs italic">
                        কোনো প্রোডাক্ট খুঁজে পাওয়া যায়নি ("{productSearchTerm}")
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reviewer Name *</label>
                  <input
                    type="text"
                    required
                    value={demoCustomerName}
                    onChange={(e) => setDemoCustomerName(e.target.value)}
                    placeholder="e.g. Arif Hossain"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white dark:bg-slate-800 focus:border-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Star Rating *</label>
                  <select
                    value={demoRating}
                    onChange={(e) => setDemoRating(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:border-purple-500 focus:outline-hidden"
                  >
                    <option value={5}>5 Stars - Excellent</option>
                    <option value={4}>4 Stars - Very Good</option>
                    <option value={3}>3 Stars - Average</option>
                    <option value={2}>2 Stars - Poor</option>
                    <option value={1}>1 Star - Terrible</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Review Comment / Feedback *</label>
                <textarea
                  required
                  rows={3}
                  value={demoComment}
                  onChange={(e) => setDemoComment(e.target.value)}
                  placeholder="e.g. পণ্যটি খুবই ভালো এবং অরজিনাল। ১ দিনের মধ্যেই ডেলিভারি পেয়েছি।"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white dark:bg-slate-800 focus:border-purple-500 focus:outline-hidden"
                />
              </div>

              {/* Product Photo Attachment (Direct Google Drive Upload & Auto URL Converter) */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>রিভিউ ছবি সংযুক্তি (Google Drive & Auto-Convert)</span>
                  </label>
                  {googleUser ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Drive সিঙ্ক সক্রিয়</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Google Drive ইন্টিগ্রেশন</span>
                  )}
                </div>

                {/* Upload Action */}
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isConnectingDrive || isUploadingDrive}
                    className="w-full p-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <FolderUp className="w-4 h-4" />
                    <span>ডিভাইস থেকে সরাসরি Google Drive-এ আপলোড করুন</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => handleUploadFileToGoogleDrive(e, 'demo')}
                    className="hidden"
                  />
                </div>

                {/* Google Drive Link Auto-Resolver Input */}
                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/80 space-y-1">
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    অথবা Google Drive বা যে কোনো ছবির লিংক পেস্ট করুন (Auto-Resolves Link):
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={demoPhotoInput}
                      onChange={(e) => setDemoPhotoInput(e.target.value)}
                      placeholder="Paste Google Drive share link or image URL..."
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white dark:bg-slate-800 focus:border-purple-500 focus:outline-hidden text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddDemoPhotoUrl()}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold cursor-pointer shrink-0 text-xs"
                    >
                      + যুক্ত করুন
                    </button>
                  </div>
                </div>

                {/* Attached Photos Preview */}
                {demoPhotos.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      সংযুক্ত মিডিয়া ({demoPhotos.length}টি):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {demoPhotos.map((url, idx) => {
                        const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('video');
                        return (
                          <div
                            key={idx}
                            className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 group shadow-2xs"
                          >
                            {isVideo ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white">
                                <Film className="w-5 h-5 text-purple-400" />
                                <span className="text-[9px] font-bold mt-0.5">Video</span>
                              </div>
                            ) : (
                              <img
                                src={getDriveDirectImageUrl(url)}
                                alt="Review attachment"
                                className="w-full h-full object-cover"
                                onError={(e) => handleImageErrorFallback(e, url)}
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => setDemoPhotos(demoPhotos.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center cursor-pointer shadow-xs hover:scale-110"
                              title="মুছে ফেলুন"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="demoVerifiedCheck"
                  checked={demoVerified}
                  onChange={(e) => setDemoVerified(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded-md border-slate-300 dark:border-slate-700 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="demoVerifiedCheck" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Mark as "Verified Purchase"
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddDemoOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Demo Review</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredReviews.map((r) => {
          const customerName = r.customerName || (r as any).userName || 'Valued Customer';
          const isApproved = r.status === 'approved';
          const isHidden = r.status === 'hidden';
          const isEditing = editingReviewId === r.id;

          return (
            <div
              key={r.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-4"
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= (isEditing ? editRating : r.rating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200 dark:text-slate-700'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1.5">
                        {isEditing ? editRating : r.rating}.0
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <h4 className="font-black text-slate-900 dark:text-white text-sm">{customerName}</h4>
                      {r.isDemo && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 text-[10px] font-extrabold border border-purple-200 dark:border-purple-800">
                          Demo Review
                        </span>
                      )}
                    </div>
                    {r.productName && (
                      <p className="text-[11px] font-semibold text-sky-700 dark:text-sky-400 mt-0.5">
                        Product: {r.productName}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isApproved
                        ? 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        : isHidden
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                        : 'bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    }`}
                  >
                    {r.status || 'pending'}
                  </span>
                </div>

                {/* Body / Editing mode */}
                {isEditing ? (
                  <div className="mt-3 space-y-3 p-3.5 rounded-2xl bg-sky-50/50 dark:bg-slate-800/80 border border-sky-200 dark:border-slate-700">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Edit Rating (1 - 5 Stars):
                      </label>
                      <select
                        value={editRating}
                        onChange={(e) => setEditRating(Number(e.target.value))}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value={5}>5 Stars - Excellent</option>
                        <option value={4}>4 Stars - Good</option>
                        <option value={3}>3 Stars - Average</option>
                        <option value={2}>2 Stars - Poor</option>
                        <option value={1}>1 Star - Terrible</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Edit Review Text / Comment:
                      </label>
                      <textarea
                        rows={3}
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:border-sky-500 focus:outline-none"
                        placeholder="Edit review text..."
                      />
                    </div>

                    {/* Photos Editor */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Manage / Add Review Photos:
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {editPhotos.map((photoUrl, pIdx) => (
                          <div key={pIdx} className="relative group w-14 h-14 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                            <img
                              src={getDriveDirectImageUrl(photoUrl)}
                              alt="Review attachment"
                              className="w-full h-full object-cover"
                              onError={(e) => handleImageErrorFallback(e, photoUrl)}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(pIdx)}
                              className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Remove photo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap pt-1 mb-2">
                        <button
                          type="button"
                          onClick={() => editFileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <FolderUp className="w-3.5 h-3.5" />
                          <span>ডিভাইস থেকে Google Drive-এ আপলোড</span>
                        </button>
                        <input
                          ref={editFileInputRef}
                          type="file"
                          accept="image/*,video/*"
                          onChange={(e) => handleUploadFileToGoogleDrive(e, 'edit')}
                          className="hidden"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="url"
                          placeholder="Paste Google Drive link or image URL..."
                          value={newPhotoUrlInput}
                          onChange={(e) => setNewPhotoUrlInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900"
                        />
                        <button
                          type="button"
                          onClick={handleAddEditPhotoUrl}
                          className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                        >
                          + Add Photo
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-sky-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setEditingReviewId(null)}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(r)}
                        className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black flex items-center gap-1 shadow-sm cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-700 dark:text-slate-200 mt-3 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 italic">
                      "{r.comment}"
                    </p>

                    {/* Customer Attached Photos Display */}
                    {r.photos && r.photos.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.photos.map((photo, pIdx) => (
                          <a
                            key={pIdx}
                            href={photo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shadow-2xs hover:scale-105 transition-transform block"
                            title="Click to view full photo"
                          >
                            <img
                              src={getDriveDirectImageUrl(photo)}
                              alt={`Review photo ${pIdx + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => handleImageErrorFallback(e, photo)}
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Action Controls for Admin */}
              {!isEditing && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    {!isApproved ? (
                      <button
                        onClick={() => onApproveReview(r.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        title="Approve & Show on Product Page"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onHideReview(r.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="Hide Review from Public"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleStartEdit(r)}
                      className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-sky-200"
                      title="Edit review text & photos"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <button
                    onClick={() => onDeleteReview(r.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Permanently Delete Review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filteredReviews.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs italic bg-white rounded-3xl border border-slate-200">
            No customer reviews found matching the selected filter.
          </div>
        )}
      </div>

      {/* Image Zoom / Full Resolution Preview Modal */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-2 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                ছবি প্রিভিউ (Full Resolution Preview)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyLink(previewModalUrl)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>লিংক কপি</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModalUrl(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-2 flex items-center justify-center overflow-auto max-h-[75vh]">
              <img
                src={getDriveDirectImageUrl(previewModalUrl)}
                alt="Full preview"
                className="max-w-full max-h-[70vh] rounded-2xl object-contain"
                onError={(e) => handleImageErrorFallback(e, previewModalUrl)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
