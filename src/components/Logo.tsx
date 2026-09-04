import { Flame } from 'lucide-react';

interface LogoProps {
  size?: number;
  showText?: boolean;
}

export function Logo({ size = 32, showText = true }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center justify-center rounded-xl bg-gradient-to-br from-terracotta-400 to-ember-600 shadow-lg shadow-terracotta-400/20"
        style={{ width: size, height: size }}
      >
        <Flame size={size * 0.6} className="text-cream-50" strokeWidth={2.5} />
      </div>
      {showText && (
        <span className="text-xl font-bold tracking-tight text-charcoal-700 dark:text-cream-100">
          Ember
        </span>
      )}
    </div>
  );
}
