import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export const PinGate: React.FC = () => {
  const { unlockApp } = useApp();
  const [pin, setPin] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorState(true);
      setErrorMessage('Please enter your security PIN');
      return;
    }

    setIsVerifying(true);
    setErrorState(false);
    setErrorMessage('');

    try {
      const success = await unlockApp(pin.trim());
      if (!success) {
        setErrorState(true);
        setErrorMessage('Incorrect security PIN. Please check Settings sheet cell B6.');
      }
    } catch {
      setErrorState(true);
      setErrorMessage('Verification failed. Please check network connection.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      id="pin-gate-screen"
      className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white"
    >
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Crest / Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-700 to-indigo-600 border border-indigo-500/40 shadow-2xl flex items-center justify-center mb-6"
        >
          <ShieldCheck className="w-8 h-8 text-white" />
        </motion.div>

        {/* Header */}
        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            MKZ-Household
          </h1>
          <p className="text-xs uppercase tracking-widest text-indigo-300 font-semibold mt-1">
            Asif Zia & Kashif Zia • Household Portal
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Enter private household security PIN to unlock
          </p>
        </div>

        {/* PIN Input Form */}
        <form onSubmit={handleFormSubmit} className="w-full space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-5 h-5 text-indigo-400" />
            </div>
            <input
              id="pin-gate-input"
              type={showPassword ? 'text' : 'password'}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (errorState) {
                  setErrorState(false);
                  setErrorMessage('');
                }
              }}
              autoFocus
              placeholder="••••••••"
              className={`w-full pl-12 pr-12 py-4 rounded-2xl bg-slate-800/90 border text-center text-lg sm:text-xl font-bold tracking-wider text-white focus:bg-slate-800 transition-all focus:outline-none focus:ring-2 ${
                errorState
                  ? 'border-rose-500 focus:ring-rose-500'
                  : 'border-slate-700 focus:ring-indigo-500 focus:border-indigo-500'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white cursor-pointer"
              title={showPassword ? 'Hide PIN' : 'Show PIN'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {errorMessage && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-rose-400 font-semibold text-center"
            >
              {errorMessage}
            </motion.p>
          )}

          <button
            id="pin-unlock-submit-btn"
            type="submit"
            disabled={isVerifying}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isVerifying ? (
              <span>Verifying with Google Sheet...</span>
            ) : (
              <>
                <span>Unlock Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Badge */}
        <div className="w-full mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Live Verified with Google Sheet (Settings cell B6)</span>
        </div>
      </div>
    </div>
  );
};
