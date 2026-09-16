import React from 'react';
import {
  CheckCircle,
  ShieldCheck,
  Truck,
  Zap,
  Sparkles,
  Star,
  Award,
  PackageCheck,
  RefreshCw,
  Headphones,
  Clock,
  BadgePercent,
  Heart,
  Flame,
  ThumbsUp,
  Gift,
  BatteryCharging,
  Tag,
  Check,
  HelpCircle,
} from 'lucide-react';
import { PRESET_HIGHLIGHT_COLORS } from '../utils/highlightConstants';

interface HighlightIconProps {
  icon?: string;
  iconColor?: string;
  className?: string;
}

export const HighlightIcon: React.FC<HighlightIconProps> = ({
  icon = 'check-circle',
  iconColor = 'emerald',
  className = 'w-4 h-4 shrink-0',
}) => {
  // Resolve text color class
  const colorObj = PRESET_HIGHLIGHT_COLORS.find((c) => c.id === iconColor);
  const colorClass = colorObj ? colorObj.textClass : 'text-emerald-600';

  const cleanIcon = (icon || 'check-circle').trim();

  // If icon is an emoji or custom unicode character (length <= 4 or not matching alphanumeric-dash)
  const isEmoji = /[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/u.test(cleanIcon) || (!cleanIcon.includes('-') && cleanIcon.length <= 4 && !/^[a-zA-Z]+$/.test(cleanIcon));

  if (isEmoji) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 leading-none select-none ${className}`}
        style={{ fontSize: '1.05em' }}
        aria-hidden="true"
      >
        {cleanIcon}
      </span>
    );
  }

  // Lucide icons map
  const iconProps = { className: `${className} ${colorClass} shrink-0` };

  switch (cleanIcon) {
    case 'check-circle':
    case 'check_circle':
    case 'check':
      return <CheckCircle {...iconProps} />;
    case 'shield-check':
    case 'shield':
      return <ShieldCheck {...iconProps} />;
    case 'truck':
    case 'delivery':
      return <Truck {...iconProps} />;
    case 'zap':
    case 'fast':
      return <Zap {...iconProps} />;
    case 'sparkles':
    case 'sparkle':
      return <Sparkles {...iconProps} />;
    case 'star':
      return <Star {...iconProps} />;
    case 'award':
      return <Award {...iconProps} />;
    case 'package-check':
    case 'package':
      return <PackageCheck {...iconProps} />;
    case 'refresh-cw':
    case 'refresh':
    case 'return':
      return <RefreshCw {...iconProps} />;
    case 'headphones':
    case 'support':
      return <Headphones {...iconProps} />;
    case 'clock':
    case 'time':
      return <Clock {...iconProps} />;
    case 'badge-percent':
    case 'percent':
    case 'discount':
      return <BadgePercent {...iconProps} />;
    case 'heart':
      return <Heart {...iconProps} />;
    case 'flame':
    case 'fire':
      return <Flame {...iconProps} />;
    case 'thumbs-up':
    case 'like':
      return <ThumbsUp {...iconProps} />;
    case 'gift':
      return <Gift {...iconProps} />;
    case 'battery-charging':
    case 'battery':
      return <BatteryCharging {...iconProps} />;
    case 'tag':
      return <Tag {...iconProps} />;
    default:
      // If user typed some other text or icon not found, fallback to check-circle
      if (cleanIcon.length <= 3) {
        return <span className={`inline-flex items-center justify-center shrink-0 ${className}`}>{cleanIcon}</span>;
      }
      return <CheckCircle {...iconProps} />;
  }
};
