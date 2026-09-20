import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        id="confirm-dialog-modal"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full shadow-2xl p-6 text-center"
      >
        <div
          className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
            isDestructive
              ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
              : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
          }`}
        >
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          {message}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            id="dialog-cancel-btn"
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            id="dialog-confirm-btn"
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-md transition-all cursor-pointer ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
