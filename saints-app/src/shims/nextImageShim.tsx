import React from 'react';

export default function Image({ src, alt = '', width, height, className, style, priority, fill, ...props }: any) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{ ...(fill ? { width: '100%', height: '100%', objectFit: 'cover' } : {}), ...style }}
      {...props}
    />
  );
}
