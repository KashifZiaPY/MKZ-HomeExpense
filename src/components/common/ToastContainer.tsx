import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div
      id="toast-container"
      className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-50 flex flex-col gap-2 pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all ${
                isSuccess
                  ? 'bg-emerald-950/90 dark:bg-emerald-950/95 text-white border-emerald-700/50 shadow-emerald-950/30'
                  : isError
                  ? 'bg-rose-950/90 dark:bg-rose-950/95 text-white border-rose-700/50 shadow-rose-950/30'
                  : 'bg-slate-900/90 dark:bg-slate-900/95 text-white border-slate-700/50 shadow-slate-950/30'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
                {!isSuccess && !isError && <Info className="w-5 h-5 text-sky-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">{toast.title}</p>
                {toast.description && (
                  <p className="text-xs text-slate-300 mt-1 leading-normal break-words">{toast.description}</p>
                )}
              </div>
              <button
                id={`dismiss-toast-${toast.id}`}
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-slate-400 hover:text-white p-1 rounded-md transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
