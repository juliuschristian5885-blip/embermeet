import { BadgeCheck } from 'lucide-react';

interface VerificationBadgeProps {
  size?: number;
  className?: string;
}

export function VerificationBadge({ size = 16, className = '' }: VerificationBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-gold-500 dark:text-gold-400 ${className}`}
      title="Verified email"
    >
      <BadgeCheck size={size} className="fill-gold-100 dark:fill-charcoal-800" />
    </span>
  );
}
