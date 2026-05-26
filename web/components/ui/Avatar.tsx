import React from 'react';

type AvatarSize = 26 | 32 | 40 | 64 | 88;

interface AvatarProps {
  initials?: string;
  image?:    string;
  size?:     AvatarSize;
  color?:    string;
}

export default function Avatar({
  initials,
  image,
  size  = 40,
  color = '#4A9EFF',
}: AvatarProps) {
  const fontSize = Math.round(size * 0.4);

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={initials ?? 'Avatar'}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
        className="border border-white/10"
      />
    );
  }

  return (
    <div
      className="inline-flex items-center justify-center rounded-full border border-white/10 shrink-0 font-semibold text-on-sky"
      style={{
        width:           size,
        height:          size,
        fontSize,
        backgroundColor: color,
        lineHeight:      1,
      }}
    >
      {(initials ?? '?').slice(0, 2).toUpperCase()}
    </div>
  );
}
