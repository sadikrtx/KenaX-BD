import React, { useState, useEffect } from 'react';
import { Product, OrderItem } from '../types';
import { resolveOriginalImageMedia } from '../lib/firebase';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

interface CartItemImageProps {
  item: OrderItem;
  product?: Product;
  className?: string;
  sizeClassName?: string;
  alt?: string;
}

const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=300&auto=format&fit=crop&q=85';

export const CartItemImage: React.FC<CartItemImageProps> = ({
  item,
  product,
  className = '',
  sizeClassName = 'w-14 h-14 sm:w-16 sm:h-16',
  alt,
}) => {
  // Determine raw starting image candidates
  const getCandidateImage = (): string => {
    // 1. Explicit color image or item image
    if (item.selectedColorImage && item.selectedColorImage.trim() !== '') {
      return item.selectedColorImage;
    }
    if (item.productImage && item.productImage.trim() !== '') {
      return item.productImage;
    }
    // 2. Lookup in product if provided
    if (product) {
      if (item.selectedColor && product.colors && product.colors.length > 0) {
        const matchedColor = product.colors.find(
          (c) => (c.name || c.colorName || '').toLowerCase() === item.selectedColor?.toLowerCase()
        );
        if (matchedColor?.imageUrl && matchedColor.imageUrl.trim() !== '') {
          return matchedColor.imageUrl;
        }
      }
      if (product.images && product.images.length > 0) {
        const valid = product.images.find((img) => typeof img === 'string' && img.trim() !== '');
        if (valid) return valid;
      }
    }
    return DEFAULT_FALLBACK_IMAGE;
  };

  const initialCandidate = getCandidateImage();
  const [imgSrc, setImgSrc] = useState<string>(() => {
    if (initialCandidate.startsWith('media://productImageMedia/')) {
      const mediaId = initialCandidate.replace('media://productImageMedia/', '');
      try {
        const cached = localStorage.getItem(`kenax_img_media_${mediaId}`);
        if (cached) return cached;
      } catch {}
      return initialCandidate;
    }
    return initialCandidate.startsWith('data:') || initialCandidate.startsWith('blob:')
      ? initialCandidate
      : getOptimizedImageUrl(initialCandidate, 300);
  });

  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const candidate = getCandidateImage();

    if (!candidate || candidate.trim() === '') {
      setImgSrc(DEFAULT_FALLBACK_IMAGE);
      setIsLoading(false);
      return;
    }

    if (candidate.startsWith('media://productImageMedia/')) {
      const mediaId = candidate.replace('media://productImageMedia/', '');
      try {
        const cached = localStorage.getItem(`kenax_img_media_${mediaId}`);
        if (cached) {
          if (isMounted) {
            setImgSrc(cached);
            setIsLoading(false);
          }
          return;
        }
      } catch {}

      resolveOriginalImageMedia(candidate).then((resolved) => {
        if (isMounted) {
          if (resolved && resolved.trim() !== '' && !resolved.startsWith('media://')) {
            setImgSrc(resolved);
            try {
              localStorage.setItem(`kenax_img_media_${mediaId}`, resolved);
            } catch {}
          } else {
            // Try product fallback
            const fb = product?.images?.[0] || DEFAULT_FALLBACK_IMAGE;
            setImgSrc(fb.startsWith('media://') ? DEFAULT_FALLBACK_IMAGE : fb);
          }
          setIsLoading(false);
        }
      });
    } else {
      const optimized = candidate.startsWith('data:') || candidate.startsWith('blob:')
        ? candidate
        : getOptimizedImageUrl(candidate, 300);
      setImgSrc(optimized);
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [item.productImage, item.selectedColorImage, item.selectedColor, product]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      if (product?.images && product.images.length > 0) {
        const fb = product.images.find((img) => img && img !== imgSrc && !img.startsWith('media://'));
        if (fb) {
          setImgSrc(fb);
          return;
        }
      }
      setImgSrc(DEFAULT_FALLBACK_IMAGE);
    }
  };

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-slate-50 border border-slate-200/80 shrink-0 flex items-center justify-center ${sizeClassName} ${className}`}
    >
      <img
        src={imgSrc}
        alt={alt || item.productName || 'Product Image'}
        onError={handleError}
        onLoad={() => setIsLoading(false)}
        loading="lazy"
        className={`w-full h-full object-contain p-1 transition-opacity duration-200 ${
          isLoading ? 'opacity-40 scale-95' : 'opacity-100 scale-100'
        }`}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-slate-100/60 animate-pulse flex items-center justify-center">
          <div className="w-3 h-3 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
        </div>
      )}
    </div>
  );
};
