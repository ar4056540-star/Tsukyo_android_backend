import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { Sparkles, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { VybeLogo } from './VybeLogo';

interface AuthModalProps {
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { loginWithEmail, signupWithEmail, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        if (onClose) onClose();
      } else if (mode === 'signup') {
        if (!displayName.trim() || !username.trim()) {
          setError('Please provide display name and username');
          setLoading(false);
          return;
        }
        await signupWithEmail(email, password, username.trim(), displayName.trim());
        if (onClose) onClose();
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setSuccessMsg('Reset request received. Contact the account administrator to complete the password reset.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-[400px] bg-[#11131a] rounded-3xl border border-[#232736] p-6 shadow-2xl text-white">
        {/* Brand Logo & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-2">
            <VybeLogo className="h-10 w-auto" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' && 'Welcome back! Sign in to join the vibe.'}
            {mode === 'signup' && 'Create your profile and start sharing.'}
            {mode === 'forgot' && 'Reset your password with your email.'}
          </p>
        </div>

        {/* Error / Success Notifications */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center space-x-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-2 text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Display Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                    className="w-full bg-[#181a24] text-white text-xs rounded-xl pl-9 pr-3 py-2.5 border border-[#2b2f3e] focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Username</label>
                <div className="relative">
                  <span className="text-xs text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 font-bold">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="janedoe"
                    required
                    className="w-full bg-[#181a24] text-white text-xs rounded-xl pl-9 pr-3 py-2.5 border border-[#2b2f3e] focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full bg-[#181a24] text-white text-xs rounded-xl pl-9 pr-3 py-2.5 border border-[#2b2f3e] focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-semibold text-slate-300">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[10px] text-pink-400 hover:underline"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#181a24] text-white text-xs rounded-xl pl-9 pr-3 py-2.5 border border-[#2b2f3e] focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 hover:brightness-110 text-xs font-bold text-white shadow-lg shadow-pink-500/25 transition active:scale-98 disabled:opacity-50 mt-2"
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In to VYBE'
              : mode === 'signup'
              ? 'Create Account'
              : 'Send Reset Link'}
          </button>
        </form>

        {/* Footer Mode Switcher */}
        <div className="mt-5 text-center">
          {mode === 'login' && (
            <p className="text-xs text-slate-400">
              Don't have an account?{' '}
              <button
                onClick={() => setMode('signup')}
                className="text-pink-400 font-semibold hover:underline"
              >
                Sign Up
              </button>
            </p>
          )}

          {mode === 'signup' && (
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-pink-400 font-semibold hover:underline"
              >
                Sign In
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <p className="text-xs text-slate-400">
              Remember your password?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-pink-400 font-semibold hover:underline"
              >
                Back to Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
