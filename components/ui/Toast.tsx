
import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // 3 seconds duration
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  const bgColors = {
    success: 'bg-slate-800 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-blue-600 text-white',
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  return (
    <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className={`${bgColors[toast.type]} px-4 py-3 rounded-lg shadow-lg shadow-slate-300/50 flex items-center gap-3 min-w-[300px] max-w-md`}>
        <div className="shrink-0">
            {icons[toast.type]}
        </div>
        <div className="flex-1 text-sm font-medium leading-tight">
          {toast.message}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition shrink-0">
            <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
