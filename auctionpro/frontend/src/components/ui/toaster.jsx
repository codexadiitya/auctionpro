import React from 'react';
import { useToast } from '../../hooks/use-toast';
import { X } from 'lucide-react';

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-0 right-0 z-50 flex flex-col p-4 space-y-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const isDestructive = toast.variant === 'destructive';
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between w-full p-4 rounded-xl border shadow-lg transition-all duration-300 animate-slide-in ${
              isDestructive
                ? 'bg-red-950/90 border-red-500/50 text-red-100'
                : 'bg-[#0f0f14]/90 border-orange-500/30 text-white'
            }`}
          >
            <div className="flex-1 mr-2">
              {toast.title && <div className="font-semibold text-sm">{toast.title}</div>}
              {toast.description && <div className="text-xs text-white/70 mt-1">{toast.description}</div>}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
