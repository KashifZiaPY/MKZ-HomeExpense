import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PinManagementModal: React.FC = () => {
  const {
    isPinManagementOpen,
    setIsPinManagementOpen,
    isPinHubAuthorized,
    lockPinHub,
    authorizePinHub,
    updatePin,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'update' | 'session'>('update');

  // Update PIN state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  // Session verification state
  const [testPin, setTestPin] = useState('');
  const [showTestPin, setShowTestPin] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isPinManagementOpen) return null;

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);
    setUpdateSuccess(null);

    if (!currentPin.trim()) {
      setUpdateError('Current PIN is required to authorize changes.');
      return;
    }
    if (!newPin.trim()) {
      setUpdateError('Please enter a new PIN.');
      return;
    }
    if (newPin.trim().length < 4) {
      setUpdateError('New PIN must be at least 4 characters long.');
      return;
    }
    if (newPin.trim() !== confirmPin.trim()) {
      setUpdateError('New PIN and Confirmation do not match.');
      return;
    }
    if (currentPin.trim() === newPin.trim()) {
      setUpdateError('New PIN must be different from current PIN.');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await updatePin(currentPin.trim(), newPin.trim());
      if (res.success) {
        setUpdateSuccess('Security PIN successfully updated in Google Sheet (cell B6)!');
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
      } else {
        setUpdateError(res.error || 'Failed to update PIN. Please verify your current PIN.');
      }
    } catch {
      setUpdateError('Network error while updating PIN in Google Sheet.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTestPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPin.trim()) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const valid = await authorizePinHub(testPin.trim());
      if (valid) {
        setTestResult({
          success: true,
          message: 'PIN verified successfully! Your session is now authorized.',
        });
        setTestPin('');
      } else {
        setTestResult({
          success: false,
          message: 'PIN verification failed. Does not match Google Sheet Settings cell B6.',
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Could not connect to Google Sheet to verify PIN.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 relative border-b border-indigo-500/20">
            <button
              onClick={() => setIsPinManagementOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider bg-indigo-500/20 text-indigo-200 uppercase border border-indigo-400/30">
                  Google Sheet Security
                </span>
                <h3 className="text-lg font-bold mt-1 text-white leading-snug">
                  PIN Management
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Settings Sheet • Cell B6
                </p>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex items-center gap-2 mt-5 bg-white/10 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('update')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'update'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Change PIN
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('session')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'session'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Session Status
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-5 sm:p-6">
            {activeTab === 'update' ? (
              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Update your security PIN across all devices. The new PIN will be live synced directly into your Google Sheet Settings tab.
                </div>

                {/* Current PIN */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Current PIN
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPin ? 'text' : 'password'}
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPin(!showCurrentPin)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New PIN */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    New Security PIN
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPin ? 'text' : 'password'}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="Enter new PIN"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPin(!showNewPin)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New PIN */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Confirm New PIN
                  </label>
                  <input
                    type="password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Re-enter new PIN"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                {updateError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{updateError}</span>
                  </motion.div>
                )}

                {updateSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{updateSuccess}</span>
                  </motion.div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Updating Google Sheet...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Save New PIN to Sheet</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Current Session</span>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {isPinHubAuthorized ? 'Authenticated' : 'Locked / Unverified'}
                      </p>
                    </div>
                    {isPinHubAuthorized ? (
                      <button
                        type="button"
                        onClick={lockPinHub}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                      >
                        Lock Session
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        PIN Required for writes
                      </span>
                    )}
                  </div>
                </div>

                {/* Test PIN Form */}
                <form onSubmit={handleTestPin} className="space-y-3 pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Verify / Test PIN Against Sheet
                  </label>
                  <div className="relative">
                    <input
                      type={showTestPin ? 'text' : 'password'}
                      value={testPin}
                      onChange={(e) => setTestPin(e.target.value)}
                      placeholder="Enter PIN to test"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTestPin(!showTestPin)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showTestPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {testResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold ${
                        testResult.success
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{testResult.message}</span>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isTesting || !testPin.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    {isTesting ? 'Verifying with Google Sheet...' : 'Verify Live Against Backend'}
                  </button>
                </form>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-2">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Configured in tab: Settings (cell B6)</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
