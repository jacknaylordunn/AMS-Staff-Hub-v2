
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Service Worker Registration
// We disable SW in preview environments (StackBlitz, Google Cloud Shell/IDX, AI Studio) because they often 
// serve the app and assets from different origins, causing SecurityErrors.
const isPreviewEnv = 
  window.location.host.includes('stackblitz') || 
  window.location.host.includes('usercontent.goog') || 
  window.location.host.includes('ai.studio') ||
  window.location.host.includes('googleusercontent.com');

if ('serviceWorker' in navigator && !isPreviewEnv) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      },
      (err) => {
        // Suppress expected errors in some environments
        console.log('ServiceWorker registration failed (This is normal in development previews): ', err);
      }
    );
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
