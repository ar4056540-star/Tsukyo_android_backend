import React, { useState } from 'react';
import { useAppLock } from '../lib/appLockContext';
import { Shield, Lock, X, Check, Trash2, KeyRound } from 'lucide-react';

interface AppLockSetupModalProps {
  onClose: () => void;
}

export const AppLockSetupModal: React.FC<AppLockSetupModalProps> = ({ onClose }) => {
  const { isAppLockConfigured, setupPin, disableAppLock } = useAppLock();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'create' | 'confirm' | 'success'>('create');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleDigit = (digit: string) => {
    setError('');
    if (step === 'create') {
      if (pin.length < 6) {
        setPin(prev => prev + digit);
      }
    } else if (step === 'confirm') {
      if (confirmPin.length < 6) {
        setConfirmPin(prev => prev + digit);
      }
    }
  };

  const handleBackspace = () => {
    setError('');
    if (step === 'create') {
      setPin(prev => prev.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleContinue = async () => {
    if (step === 'create') {
      if (pin.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }
      setError('');
      setStep('confirm');
    } else if (step === 'confirm') {
      if (confirmPin.length < 4) {
        setError('Please re-enter your full PIN');
        return;
      }
      if (confirmPin !== pin) {
        setError('PINs do not match. Try again.');
        setConfirmPin('');
        return;
      }

      setIsSaving(true);
      try {
        await setupPin(pin);
        setStep('success');
        setTimeout(() => {
          onClose();
        }, 1200);
      } catch (err: any) {
        console.error('AppLock setup failed:', err);
        setError(err?.message || 'Failed to configure PIN');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleRemove = async () => {
    const ok = window.confirm('Are you sure you want to disable AppLock?');
    if (ok) {
      await disableAppLock();
      onClose();
    }
  };

  const currentVal = step === 'create' ? pin : confirmPin;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-0 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-[480px] h-[85vh] bg-[#0b0c0e] rounded-t-3xl sm:rounded-3xl border border-[#222634] flex flex-col justify-between overflow-hidden text-white p-6 shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-pink-500" />
            <h3 className="text-base font-bold text-white">AppLock Security</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center Prompt & Indicators */}
        <div className="flex flex-col items-center justify-center my-auto">
          {step === 'success' ? (
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-black text-white mb-1">AppLock Enabled</h4>
              <p className="text-xs text-slate-400 text-center max-w-xs">
                Your PIN is securely configured with encrypted storage.
              </p>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-4">
                <Lock className="w-6 h-6" />
              </div>

              <h4 className="text-lg font-bold text-white mb-1">
                {step === 'create' ? 'Set a Security PIN' : 'Confirm Your PIN'}
              </h4>
              <p className="text-xs text-slate-400 text-center max-w-xs mb-6">
                {step === 'create'
                  ? 'Enter a 4 to 6-digit PIN to lock VYBE whenever you leave the app.'
                  : 'Re-enter your PIN to verify.'}
              </p>

              {/* Dots Indicator */}
              <div className="flex space-x-3 mb-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition ${
                      currentVal.length > i
                        ? 'bg-pink-500 border-pink-500 scale-110 shadow-lg'
                        : 'border-slate-600 bg-[#171922]'
                    }`}
                  />
                ))}
              </div>

              {error && (
                <p className="text-xs text-red-400 font-semibold mb-2 text-center animate-shake">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {/* Number Keypad */}
        {step !== 'success' && (
          <div className="w-full max-w-[300px] mx-auto space-y-2">
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  onClick={() => handleDigit(d)}
                  className="h-13 rounded-2xl bg-[#171a24] hover:bg-[#232738] active:scale-95 text-lg font-bold text-white border border-[#2b2f40] transition flex items-center justify-center shadow-sm"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={handleBackspace}
                className="h-13 rounded-2xl bg-[#171a24] hover:bg-[#232738] text-xs font-semibold text-slate-400 border border-[#2b2f40] transition flex items-center justify-center"
              >
                DEL
              </button>
              <button
                onClick={() => handleDigit('0')}
                className="h-13 rounded-2xl bg-[#171a24] hover:bg-[#232738] active:scale-95 text-lg font-bold text-white border border-[#2b2f40] transition flex items-center justify-center shadow-sm"
              >
                0
              </button>
              <button
                onClick={handleContinue}
                disabled={currentVal.length < 4 || isSaving}
                className="h-13 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 active:scale-95 text-xs font-bold text-white disabled:opacity-30 transition flex items-center justify-center shadow"
              >
                {isSaving ? '...' : step === 'create' ? 'NEXT' : 'SAVE'}
              </button>
            </div>

            {isAppLockConfigured && (
              <button
                onClick={handleRemove}
                className="w-full py-2.5 text-xs text-red-400 hover:text-red-300 flex items-center justify-center space-x-1.5 transition mt-3"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Disable AppLock</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
