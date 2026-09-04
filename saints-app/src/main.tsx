import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/desktop.css';
import { ThemeProvider } from 'next-themes';

/**
 * Global Client-Side Fetch Interceptor for Standalone Desktop Studio.
 * - Routes all `/api/*` requests to the configured remote server URL with Bearer session auth.
 * - Resolves relative assets under `file://` protocol.
 */
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;

    // 1. Route API calls to remote server
    if (url.startsWith('/api/')) {
      const baseUrl = (window as any).__studioBaseUrl
        || localStorage.getItem('saints_studio_server_url')
        || 'https://saintsgaming.net';
      const cleanBase = baseUrl.replace(/\/+$/, '');
      const fullUrl = `${cleanBase}${url}`;

      const token = localStorage.getItem('saints_studio_token');
      const headers = new Headers(init?.headers);
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      return originalFetch(fullUrl, {
        ...init,
        headers,
      });
    }

    // 2. Route local packaged assets under file:// protocol
    if (window.location.protocol === 'file:' && (url.startsWith('/game-assets/') || url.startsWith('/images/') || url.startsWith('/favicon.'))) {
      url = `.${url}`;
    }

    return originalFetch(url, init);
  };
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="vice" enableSystem={false}>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
