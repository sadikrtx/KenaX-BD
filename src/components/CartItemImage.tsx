import React, { useState, useEffect } from 'react';
import { Product, OrderItem } from '../types';
import { resolveOriginalImageMedia, getSynchronouslyResolvedMedia } from '../lib/firebase';
import { getOptimizedImageUrl, NEUTRAL_PRODUCT_PLACEHOLDER, markImageLoaded, handleImageError } from '../utils/imageOptimizer';

interface CartItemImageProps {
  item?: OrderItem | any;
  product?: Product;
  className?: string;
  sizeClassName?: string;
  alt?: string;
}

const DEFAULT_FALLBACK_IMAGE = NEUTRAL_PRODUCT_PLACEHOLDER;

export const CartItemImage: React.FC<CartItemImageProps> = ({
  item,
  product,
  className = '',
  sizeClassName = 'w-14 h-14 sm:w-16 sm:h-16',
  alt,
}) => {
  // Determine raw starting image candidates
  const getCandidateImage = (): string => {
    // 1. Explicit color image on item
    if (item?.selectedColorImage && typeof item.selectedColorImage === 'string' && item.selectedColorImage.trim() !== '') {
      return item.selectedColorImage;
    }

    // 2. Lookup by selected color or variant string in product if available
    if (product && item) {
      const colorCandidate = item.selectedColor || (item.variant ? item.variant.split('/')[0].trim() : '');
      if (colorCandidate && product.colors && product.colors.length > 0) {
        const matchedColor = product.colors.find(
          (c) => (c.name || c.colorName || '').trim().toLowerCase() === colorCandidate.toLowerCase()
        );
        if (matchedColor?.imageUrl && matchedColor.imageUrl.trim() !== '') {
          return matchedColor.imageUrl;
        }
      }
    }

    // 3. Explicit item product image / image / imageUrl / thumbnail
    if (item?.productImage && typeof item.productImage === 'string' && item.productImage.trim() !== '') {
      return item.productImage;
    }
    if (item?.image && typeof item.image === 'string' && item.image.trim() !== '') {
      return item.image;
    }
    if (item?.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.trim() !== '') {
      return item.imageUrl;
    }
    if (item?.thumbnail && typeof item.thumbnail === 'string' && item.thumbnail.trim() !== '') {
      return item.thumbnail;
    }

    // 4. Product images
    if (product) {
      if (product.featuredImage && typeof product.featuredImage === 'string' && product.featuredImage.trim() !== '') {
        return product.featuredImage;
      }
      if (product.images && product.images.length > 0) {
        const valid = product.images.find((img) => typeof img === 'string' && img.trim() !== '');
        if (valid) return valid;
      }
      if (product.colors && product.colors.length > 0) {
        const firstColorWithImg = product.colors.find((c) => c.imageUrl && c.imageUrl.trim() !== '');
        if (firstColorWithImg) return firstColorWithImg.imageUrl!;
      }
    }

    return DEFAULT_FALLBACK_IMAGE;
  };

  const initialCandidate = getCandidateImage();
  const [imgSrc, setImgSrc] = useState<string>(() => {
    if (initialCandidate.startsWith('media://')) {
      const syncVal = getSynchronouslyResolvedMedia(initialCandidate);
      if (syncVal) return syncVal;
      return initialCandidate;
    }
    return initialCandidate.startsWith('data:') || initialCandidate.startsWith('blob:')
      ? initialCandidate
      : getOptimizedImageUrl(initialCandidate, 800);
  });

  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(() => initialCandidate.startsWith('media://') && !getSynchronouslyResolvedMedia(initialCandidate));

  useEffect(() => {
    let isMounted = true;
    const candidate = getCandidateImage();

    if (!candidate || candidate.trim() === '') {
      setImgSrc(DEFAULT_FALLBACK_IMAGE);
      setIsLoading(false);
      return;
    }

    if (candidate.startsWith('media://')) {
      const syncVal = getSynchronouslyResolvedMedia(candidate);
      if (syncVal) {
        setImgSrc(syncVal);
        setIsLoading(false);
        markImageLoaded(syncVal, 800);
        return;
      }

      resolveOriginalImageMedia(candidate).then((resolved) => {
        if (isMounted) {
          if (resolved && resolved.trim() !== '' && !resolved.startsWith('media://')) {
            setImgSrc(resolved);
            markImageLoaded(resolved, 800);
          } else {
            // Try product fallback
            const fb = product?.featuredImage || product?.images?.[0] || DEFAULT_FALLBACK_IMAGE;
            setImgSrc(fb.startsWith('media://') ? DEFAULT_FALLBACK_IMAGE : getOptimizedImageUrl(fb, 800));
          }
          setIsLoading(false);
        }
      });
    } else {
      const optimized = candidate.startsWith('data:') || candidate.startsWith('blob:')
        ? candidate
        : getOptimizedImageUrl(candidate, 800);
      setImgSrc(optimized);
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [
    item?.productImage,
    item?.image,
    item?.imageUrl,
    item?.selectedColorImage,
    item?.selectedColor,
    product?.id,
    product?.featuredImage,
    product?.images?.[0],
  ]);

  const onError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError) {
      setHasError(true);
      if (product?.images && product.images.length > 0) {
        const fb = product.images.find((img) => img && img !== imgSrc && !img.startsWith('media://'));
        if (fb) {
          setImgSrc(getOptimizedImageUrl(fb, 800));
          return;
        }
      }
      handleImageError(e, initialCandidate);
    }
  };

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-slate-50 border border-slate-200/80 shrink-0 flex items-center justify-center ${sizeClassName} ${className}`}
    >
      <img
        src={imgSrc}
        alt={alt || item?.productName || item?.name || product?.name || 'Product Image'}
        referrerPolicy="no-referrer"
        onError={onError}
        onLoad={() => {
          setIsLoading(false);
          markImageLoaded(imgSrc, 800);
        }}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover"
      />
      {isLoading && (
        <div className="absolute inset-0 bg-slate-100/60 animate-pulse flex items-center justify-center">
          <div className="w-3 h-3 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
        </div>
      )}
    </div>
  );
};
