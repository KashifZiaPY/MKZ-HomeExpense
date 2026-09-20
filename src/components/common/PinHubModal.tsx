import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Eye, EyeOff, X, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PinHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionTitle?: string;
  onSuccessCallback?: () => void;
}

export const PinHubModal: React.FC<PinHubModalProps> = ({
  isOpen,
  onClose,
  actionTitle = 'Perform Protected Action',
  onSuccessCallback,
}) => {
  const { authorizePinHub, showToast } = useApp();
  const [pinInput, setPinInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput.trim()) {
      setError('Please enter your security PIN');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const authorized = await authorizePinHub(pinInput.trim());
      if (authorized) {
        setPinInput('');
        onClose();
        if (onSuccessCallback) {
          onSuccessCallback();
        }
      } else {
        setError('Incorrect Security PIN. Verification failed against Google Sheet (cell B6).');
      }
    } catch {
      setError('Verification failed. Please check your connection.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white p-5 sm:p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider bg-white/20 uppercase">
                  Security Authentication
                </span>
                <h3 className="text-lg font-bold mt-1 text-white leading-snug">
                  Authorize Action
                </h3>
                <p className="text-xs text-indigo-100/90 mt-0.5">
                  {actionTitle}
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Saving, editing, or deleting entries requires authentication with your household security PIN stored in Google Sheet Settings.
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Security PIN (Settings Cell B6)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (error) setError(null);
                  }}
                  autoFocus
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-20 py-3.5 rounded-xl border text-sm font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800 transition-all focus:outline-none focus:ring-2 ${
                    error
                      ? 'border-rose-300 dark:border-rose-800 focus:ring-rose-500'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-600'
                  }`}
                />
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isVerifying ? (
                  <span>Verifying with Google Sheet...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Authorize</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
