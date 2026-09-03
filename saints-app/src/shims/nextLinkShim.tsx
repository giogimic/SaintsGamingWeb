import React from 'react';

export default function Link({ href, children, className, title, onClick, target, ...props }: any) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) onClick(e);
    if (href && typeof href === 'string') {
      e.preventDefault();
      const studioBase = typeof window !== 'undefined' && (window as any).__studioBaseUrl
        ? (window as any).__studioBaseUrl
        : 'https://saintsgaming.net';
      const cleanBase = studioBase.replace(/\/+$/, '');
      const fullUrl = href.startsWith('http') ? href : `${cleanBase}${href.startsWith('/') ? href : `/${href}`}`;
      if ((window as any).electronAPI?.openExternal) {
        (window as any).electronAPI.openExternal(fullUrl);
      } else {
        window.open(fullUrl, '_blank');
      }
    }
  };

  return (
    <a
      href={typeof href === 'string' ? href : '#'}
      className={className}
      title={title}
      onClick={handleClick}
      {...props}
    >
      {children}
    </a>
  );
}
