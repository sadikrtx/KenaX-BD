import React, { useState } from 'react';
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
} from 'lucide-react';
import { Review, UserRole, StaffUser } from '../../types';

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

  const handleAddPhotoUrl = () => {
    if (!newPhotoUrlInput.trim()) return;
    setEditPhotos([...editPhotos, newPhotoUrlInput.trim()]);
    setNewPhotoUrlInput('');
  };

  const handleRemovePhoto = (index: number) => {
    setEditPhotos(editPhotos.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviews by customer name or keywords..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white cursor-pointer"
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
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  <span>Add Demo Review</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Demo reviews appear on product pages naturally like authentic customer feedback.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDemoOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDemoReview} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Product *</label>
                <select
                  required
                  value={demoProductId}
                  onChange={(e) => setDemoProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-900 bg-white focus:border-purple-500 focus:outline-hidden"
                >
                  <option value="" disabled>-- Select a Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (৳{p.price})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reviewer Name *</label>
                  <input
                    type="text"
                    required
                    value={demoCustomerName}
                    onChange={(e) => setDemoCustomerName(e.target.value)}
                    placeholder="e.g. Arif Hossain"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:border-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Star Rating *</label>
                  <select
                    value={demoRating}
                    onChange={(e) => setDemoRating(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white focus:border-purple-500 focus:outline-hidden"
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
                <label className="block font-bold text-slate-700 mb-1">Review Comment / Feedback *</label>
                <textarea
                  required
                  rows={3}
                  value={demoComment}
                  onChange={(e) => setDemoComment(e.target.value)}
                  placeholder="e.g. পণ্যটি খুবই ভালো এবং অরজিনাল। ১ দিনের মধ্যেই ডেলিভারি পেয়েছি।"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:border-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Photo Attachment (Optional URL)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={demoPhotoInput}
                    onChange={(e) => setDemoPhotoInput(e.target.value)}
                    placeholder="Paste image URL (e.g. https://...)"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 focus:border-purple-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (demoPhotoInput.trim()) {
                        setDemoPhotos([...demoPhotos, demoPhotoInput.trim()]);
                        setDemoPhotoInput('');
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold cursor-pointer shrink-0"
                  >
                    + Add
                  </button>
                </div>
                {demoPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {demoPhotos.map((url, idx) => (
                      <div key={idx} className="relative w-12 h-12 rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
                        <img src={url} alt="Demo attachment" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setDemoPhotos(demoPhotos.filter((_, i) => i !== idx))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="demoVerifiedCheck"
                  checked={demoVerified}
                  onChange={(e) => setDemoVerified(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded-md border-slate-300 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="demoVerifiedCheck" className="font-bold text-slate-700 cursor-pointer">
                  Mark as "Verified Purchase"
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDemoOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
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
              className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all space-y-4"
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
                              : 'text-slate-200'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-bold text-slate-700 ml-1.5">
                        {isEditing ? editRating : r.rating}.0
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <h4 className="font-black text-slate-900 text-sm">{customerName}</h4>
                      {r.isDemo && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-extrabold border border-purple-200">
                          Demo Review
                        </span>
                      )}
                    </div>
                    {r.productName && (
                      <p className="text-[11px] font-semibold text-sky-700 mt-0.5">
                        Product: {r.productName}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400">
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
                        ? 'bg-emerald-100 text-emerald-800'
                        : isHidden
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {r.status || 'pending'}
                  </span>
                </div>

                {/* Body / Editing mode */}
                {isEditing ? (
                  <div className="mt-3 space-y-3 p-3.5 rounded-2xl bg-sky-50/50 border border-sky-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Edit Rating (1 - 5 Stars):
                      </label>
                      <select
                        value={editRating}
                        onChange={(e) => setEditRating(Number(e.target.value))}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-900"
                      >
                        <option value={5}>5 Stars - Excellent</option>
                        <option value={4}>4 Stars - Good</option>
                        <option value={3}>3 Stars - Average</option>
                        <option value={2}>2 Stars - Poor</option>
                        <option value={1}>1 Star - Terrible</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Edit Review Text / Comment:
                      </label>
                      <textarea
                        rows={3}
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:border-sky-500 focus:outline-none"
                        placeholder="Edit review text..."
                      />
                    </div>

                    {/* Photos Editor */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Manage / Add Review Photos:
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {editPhotos.map((photoUrl, pIdx) => (
                          <div key={pIdx} className="relative group w-14 h-14 rounded-xl overflow-hidden border border-slate-300 bg-white">
                            <img src={photoUrl} alt="Review attachment" className="w-full h-full object-cover" />
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

                      <div className="flex items-center gap-1.5">
                        <input
                          type="url"
                          placeholder="Paste image URL..."
                          value={newPhotoUrlInput}
                          onChange={(e) => setNewPhotoUrlInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleAddPhotoUrl}
                          className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                        >
                          + Add Photo
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-sky-200">
                      <button
                        type="button"
                        onClick={() => setEditingReviewId(null)}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
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
                    <p className="text-xs text-slate-700 mt-3 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100 italic">
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
                            <img src={photo} alt={`Review photo ${pIdx + 1}`} className="w-full h-full object-cover" />
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
    </div>
  );
};
