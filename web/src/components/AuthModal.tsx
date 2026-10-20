import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  ChefHat,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

declare global {
  interface Window {
    google?: any;
  }
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
}) => {
  const { login, signup, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Executive Chef');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMode(defaultMode);
    setError(null);
  }, [defaultMode, isOpen]);

  // Initialize Google Identity Services
  useEffect(() => {
    if (!isOpen) return;

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) return;

    if (window.google?.accounts?.id && googleButtonRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (response.credential) {
              setIsGoogleLoading(true);
              try {
                await loginWithGoogle(response.credential);
                setIsSuccess(true);
                setTimeout(() => {
                  onClose();
                  setIsSuccess(false);
                }, 600);
              } catch (err: any) {
                setError(err.message || 'Google authentication failed');
              } finally {
                setIsGoogleLoading(false);
              }
            }
          },
        });

        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: mode === 'login' ? 'signin_with' : 'signup_with',
          shape: 'rectangular',
        });
      } catch (err) {
        console.warn('Google One Tap init error:', err);
      }
    }
  }, [isOpen, mode, loginWithGoogle, onClose]);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login({ email: email.trim().toLowerCase(), password });
      } else {
        await signup({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim() || email.split('@')[0],
          role,
        });
      }

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomGoogleClick = async () => {
    setError(null);
    setIsGoogleLoading(true);

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (window.google?.accounts?.id && googleClientId) {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log('Google prompt not displayed or skipped');
        }
      });
      setIsGoogleLoading(false);
      return;
    }

    try {
      const promptEmail = window.prompt(
        'Enter your Gmail address to sign in with Google (or leave default for demo chef account):',
        email || 'executive.chef@gmail.com'
      );

      if (!promptEmail) {
        setIsGoogleLoading(false);
        return;
      }

      const cleanEmail = promptEmail.toLowerCase().trim();
      const extractedName = cleanEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      await loginWithGoogle({
        email: cleanEmail,
        name: extractedName || 'Google Chef',
        picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(extractedName)}&backgroundColor=0284c7`,
        googleId: `google-user-${Date.now()}`,
      });

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-neu-surface border border-neu-border rounded-2xl shadow-neu-raised-lg overflow-hidden transform transition-all duration-300 scale-100 text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Accent Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-500" />

        {/* Modal Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-neu-surface border border-neu-border shadow-neu-raised-sm flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-sky-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Kitchen<span className="text-sky-500">Pulse</span> Auth
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {mode === 'login' ? 'Welcome back! Sign in to operations' : 'Join the kitchen operations crew'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-neu-sunken p-1 rounded-xl border border-neu-borderSubtle shadow-neu-inset-sm mt-5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-glow-sky'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-glow-sky'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Error / Success Feedback */}
        <div className="px-6">
          {error && (
            <div className="mb-4 flex items-start space-x-2.5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-300 text-xs animate-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span className="flex-1 leading-relaxed">{error}</span>
            </div>
          )}

          {isSuccess && (
            <div className="mb-4 flex items-center space-x-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Authentication successful! Accessing KitchenPulse...</span>
            </div>
          )}
        </div>

        {/* Google One-Click Action */}
        <div className="px-6 pb-2">
          <div ref={googleButtonRef} className="w-full flex justify-center empty:hidden mb-2" />

          <button
            type="button"
            onClick={handleCustomGoogleClick}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 bg-neu-surface hover:bg-neu-hover active:scale-[0.99] border border-neu-border text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-neu-raised-sm hover:shadow-neu-raised transition-all duration-200 cursor-pointer"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
            ) : (
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span className="tracking-wide">
              {mode === 'login' ? 'Continue with Google / Gmail' : 'Sign up with Google / Gmail'}
            </span>
          </button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neu-borderSubtle" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
              <span className="bg-neu-surface px-2.5 text-slate-500">Or continue with credentials</span>
            </div>
          </div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="p-6 pt-0 space-y-3.5">
          {mode === 'signup' && (
            <>
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Marco Pierre White"
                    className="w-full bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Station Role */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Kitchen Role
                </label>
                <div className="relative">
                  <ChefHat className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="Executive Chef" className="bg-neu-surface text-slate-900 dark:text-white">Executive Chef</option>
                    <option value="Sous Chef" className="bg-neu-surface text-slate-900 dark:text-white">Sous Chef</option>
                    <option value="Line Cook" className="bg-neu-surface text-slate-900 dark:text-white">Line Cook</option>
                    <option value="Station Lead" className="bg-neu-surface text-slate-900 dark:text-white">Station Lead</option>
                    <option value="Kitchen Manager" className="bg-neu-surface text-slate-900 dark:text-white">Kitchen Manager</option>
                    <option value="Server / Front of House" className="bg-neu-surface text-slate-900 dark:text-white">Server / Front of House</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="chef@kitchenpulse.io"
                className="w-full bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none font-mono transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Password
              </label>
              {mode === 'signup' && (
                <span className="text-[10px] text-slate-500">Min 6 characters</span>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm focus:border-sky-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none font-mono transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (Sign Up only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full bg-neu-sunken border rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none font-mono transition-all ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-rose-500'
                      : 'border-neu-borderSubtle focus:border-sky-500'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-600 hover:from-sky-400 hover:via-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold tracking-wide shadow-glow-sky transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{mode === 'login' ? 'Authenticating...' : 'Creating Account...'}</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In to KitchenPulse' : 'Create Operator Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Footer note */}
          <div className="pt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
            {mode === 'login' ? (
              <span>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className="text-sky-600 dark:text-sky-400 hover:underline font-bold cursor-pointer"
                >
                  Create one now
                </button>
              </span>
            ) : (
              <span>
                Already have credentials?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-sky-600 dark:text-sky-400 hover:underline font-bold cursor-pointer"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
