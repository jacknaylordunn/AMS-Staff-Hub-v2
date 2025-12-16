
import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
  toast: {
      success: (msg: string) => void;
      error: (msg: string) => void;
      info: (msg: string) => void;
      warning: (msg: string) => void;
  }
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const toastHelpers = {
      success: (msg: string) => addToast(msg, 'success'),
      error: (msg: string) => addToast(msg, 'error'),
      info: (msg: string) => addToast(msg, 'info'),
      warning: (msg: string) => addToast(msg, 'warning'),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast: toastHelpers }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: string) => void }) => {
    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none pr-4 sm:pr-0">
            {toasts.map(t => (
                <div 
                    key={t.id} 
                    className={`
                        pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border animate-in slide-in-from-right-full duration-300
                        ${t.type === 'success' ? 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-900' : ''}
                        ${t.type === 'error' ? 'bg-white dark:bg-slate-800 border-red-200 dark:border-red-900' : ''}
                        ${t.type === 'info' ? 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-900' : ''}
                        ${t.type === 'warning' ? 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-900' : ''}
                    `}
                >
                    <div className="flex-shrink-0 mt-0.5">
                        {t.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {t.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                        {t.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                        {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                    </div>
                    <div className="flex-1">
                        <p className={`text-sm font-medium ${
                            t.type === 'success' ? 'text-green-800 dark:text-green-200' :
                            t.type === 'error' ? 'text-red-800 dark:text-red-200' :
                            t.type === 'warning' ? 'text-amber-800 dark:text-amber-200' :
                            'text-slate-800 dark:text-white'
                        }`}>
                            {t.message}
                        </p>
                    </div>
                    <button onClick={() => removeToast(t.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
