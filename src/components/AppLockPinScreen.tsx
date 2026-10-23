import React, { useState } from 'react';
import { useAppLock } from '../lib/appLockContext';
import { useAuth } from '../lib/authContext';
import { getAvatarUrl } from '../lib/constants';
import { Lock, ShieldAlert, KeyRound, Sparkles } from 'lucide-react';
import { VybeLogo } from './VybeLogo';

export const AppLockPinScreen: React.FC = () => {
  const { unlockWithPin, disableAppLock } = useAppLock();
  const { userProfile, logout } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleDigit = async (digit: string) => {
    if (isVerifying) return;
    if (pin.length < 6) {
      const next = pin + digit;
      setPin(next);
      setError(false);

      if (next.length >= 4) {
        setIsVerifying(true);
        const ok = await unlockWithPin(next);
        setIsVerifying(false);
        if (ok) {
          setError(false);
        } else if (next.length >= 6) {
          triggerError();
        }
      }
    }
  };

  const handleManualSubmit = async () => {
    if (pin.length < 4 || isVerifying) return;
    setIsVerifying(true);
    const ok = await unlockWithPin(pin);
    setIsVerifying(false);
    if (!ok) {
      triggerError();
    }
  };

  const triggerError = () => {
    setError(true);
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setPin('');
    }, 600);
  };

  const handleBackspace = () => {
    if (isVerifying) return;
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleForgotPin = async () => {
    const confirmReset = window.confirm(
      'Forgot your AppLock PIN? Logging out of VYBE will end this protected session.'
    );
    if (confirmReset) {
      await logout();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0c0e] flex items-center justify-center select-none text-white p-6">
      <div className="w-full max-w-[360px] flex flex-col items-center justify-between h-[85vh]">
        {/* Top Header & Avatar */}
        <div className="flex flex-col items-center mt-4">
          <VybeLogo className="h-7 w-auto mb-4" />
          <div className="relative mb-3">
            <img
              src={getAvatarUrl(userProfile?.photoURL)}
              alt="User avatar"
              className="w-20 h-20 rounded-full object-cover ring-2 ring-pink-500 p-0.5"
            />
            <div className="absolute -bottom-1 -right-1 bg-[#12141c] p-1.5 rounded-full border border-pink-500">
              <Lock className="w-4 h-4 text-pink-400" />
            </div>
          </div>

          <h3 className="text-lg font-bold text-white">VYBE is Locked</h3>
          <p className="text-xs text-slate-400 mt-0.5">Enter your security PIN to continue</p>
        </div>

        {/* PIN Dots */}
        <div className="flex flex-col items-center my-auto">
          <div className={`flex space-x-3.5 ${shake ? 'animate-bounce' : ''}`}>
            {[0, 1, 2, 3, 4, 5].slice(0, Math.max(4, pin.length)).map((i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                  pin.length > i
                    ? error
                      ? 'bg-red-500 border-red-500 scale-125'
                      : 'bg-pink-500 border-pink-500 scale-125 shadow-lg shadow-pink-500/50'
                    : 'border-slate-600 bg-[#161822]'
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-400 mt-4 animate-in fade-in">
              Incorrect PIN. Try again.
            </p>
          )}
        </div>

        {/* Keypad */}
        <div className="w-full space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                onClick={() => handleDigit(d)}
                className="h-14 rounded-2xl bg-[#151722] hover:bg-[#202434] active:scale-90 text-xl font-bold text-white border border-[#25293a] transition flex items-center justify-center shadow"
              >
                {d}
              </button>
            ))}
            <button
              onClick={handleBackspace}
              className="h-14 rounded-2xl bg-[#151722] hover:bg-[#202434] text-xs font-semibold text-slate-400 border border-[#25293a] transition flex items-center justify-center"
            >
              DEL
            </button>
            <button
              onClick={() => handleDigit('0')}
              className="h-14 rounded-2xl bg-[#151722] hover:bg-[#202434] active:scale-90 text-xl font-bold text-white border border-[#25293a] transition flex items-center justify-center shadow"
            >
              0
            </button>
            <button
              onClick={handleManualSubmit}
              disabled={pin.length < 4 || isVerifying}
              className="h-14 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-xs font-bold text-white disabled:opacity-40 transition flex items-center justify-center shadow"
            >
              {isVerifying ? '...' : 'OK'}
            </button>
          </div>

          {/* Forgot PIN Action */}
          <button
            onClick={handleForgotPin}
            className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition text-center"
          >
            Forgot PIN? Reset via Logout
          </button>
        </div>
      </div>
    </div>
  );
};
