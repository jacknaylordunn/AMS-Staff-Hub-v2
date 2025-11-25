
import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-red-600 dark:bg-red-900 text-white dark:text-red-100 px-4 py-2 text-center text-sm font-bold flex items-center justify-center gap-2 animate-in slide-in-from-top sticky top-0 z-50 shadow-md">
      <WifiOff className="w-4 h-4" />
      You are currently offline. Changes will sync when connection is restored.
    </div>
  );
};

export default OfflineIndicator;
