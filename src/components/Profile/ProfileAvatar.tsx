import React, { useEffect, useState } from 'react';

interface ProfileAvatarProps {
  displayName?: string;
  avatarDataUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ProfileAvatarProps['size']>, string> = {
  xs: 'w-7 h-7 text-[11px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  displayName = '',
  avatarDataUrl,
  size = 'sm',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [avatarDataUrl]);

  const trimmedName = displayName.trim();
  const initial = trimmedName ? trimmedName.charAt(0).toUpperCase() : 'Y';
  const showImage = Boolean(avatarDataUrl && avatarDataUrl.trim() && !hasError);

  return (
    <div
      className={`${SIZE_CLASSES[size]} rounded-full overflow-hidden shrink-0 flex items-center justify-center font-semibold select-none ring-1 ring-slate-200 dark:ring-white/20 ${
        showImage
          ? 'bg-slate-900'
          : 'bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 text-white'
      } ${className}`}
    >
      {showImage ? (
        <img
          src={avatarDataUrl}
          alt={trimmedName ? `${trimmedName}'s profile avatar` : 'User profile avatar'}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </div>
  );
};
