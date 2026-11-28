import React from 'react';

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  disabled?: boolean;
}

/**
 * Lightweight, compositor-friendly entrance transition inspired by Magic UI BlurFade.
 * Automatically disables motion when `disabled` is true or `prefers-reduced-motion` is set.
 */
export const BlurFade: React.FC<BlurFadeProps> = ({
  children,
  className = '',
  delayMs = 0,
  disabled = false,
}) => {
  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={`atmiya-blur-fade ${className}`}
      style={delayMs > 0 ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
};

interface TextRevealProps {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'p' | 'span' | 'div';
  disabled?: boolean;
}

/**
 * Subtle typographic reveal for companion headings and greetings.
 */
export const TextReveal: React.FC<TextRevealProps> = ({
  children,
  className = '',
  as: Component = 'span',
  disabled = false,
}) => (
  <Component className={`${disabled ? '' : 'atmiya-text-reveal '} ${className}`.trim()}>
    {children}
  </Component>
);
