'use client';

import Image from 'next/image';
import { useId } from 'react';

interface MurmurMarkProps {
  /**
   * Controls the rendered HEIGHT of the logo in px.
   * Width scales automatically to preserve the image's natural aspect ratio.
   * Default: 32
   */
  size?: number;
  /**
   * 'image' — renders the real PNG from /public/assets/murmur_icon.png
   * 'svg'   — inline gradient SVG mark (fallback / icon-only contexts)
   * Default: 'image'
   */
  variant?: 'image' | 'svg';
}

export default function MurmurMark({
  size = 32,
  variant = 'image',
}: MurmurMarkProps) {
  const id         = useId().replace(/:/g, '');
  const gradientId = `murmur-mark-${id}`;

  if (variant === 'image') {
    return (
      <Image
        src="/assets/murmur_icon.png"
        alt="Murmur"
        width={size}
        height={size}
        priority
        unoptimized
        className="shrink-0 object-contain"
        style={{
          height: size,
          width:  size,
        }}
      />
    );
  }

  /* SVG gradient mark – now using #0083ff accent */
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="3" y1="21" x2="21" y2="3"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0083ff" />
          <stop offset="1" stopColor="#66b5ff" />
        </linearGradient>
      </defs>
      <path
        d="M4 19V5.2L9.4 14.1L14.6 5.2V19H12.7V9.8L9.4 15.4L6.1 9.8V19H4Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}