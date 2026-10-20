import React, { useState, useEffect } from 'react';
import {
  Flame,
  Mail,
  Lock,
  User as UserIcon,
  ChefHat,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Building2,
  Crown,
  Shield,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { authApi } from '../api/client.js';
import { Organization } from '../types/index.js';
import { ThemeToggle } from './ThemeToggle.js';

export const AuthPortal: React.FC = () => {
  const { login, signup, loginWithGoogle } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [signupType, setSignupType] = useState<'new_org' | 'join_org'>('new_org');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Admin');
  const [orgName, setOrgName] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  // UI States
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Fetch available organizations for selector
  useEffect(() => {
    let isMounted = true;
    authApi
      .getOrganizations()
      .then((res) => {
        if (isMounted) {
          setOrganizations(res.organizations || []);
          if (res.organizations?.length > 0 && !selectedOrgId) {
            setSelectedOrgId(res.organizations[0].id);
          }
        }
      })
      .catch((err) => console.warn('Could not fetch organizations list:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in your email and password.');
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
      if (signupType === 'new_org' && !orgName.trim()) {
        setError('Please provide a Hotel or Restaurant Group name.');
        return;
      }
      if (signupType === 'join_org' && !selectedOrgId) {
        setError('Please select an organization to join.');
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
          role: signupType === 'new_org' ? 'Owner' : role,
          organization_name: signupType === 'new_org' ? orgName.trim() : undefined,
          organization_id: signupType === 'join_org' ? selectedOrgId : undefined,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setError(null);
    setEmail(demoEmail);
    setPassword('password123');
    setIsLoading(true);
    try {
      await login({ email: demoEmail, password: 'password123' });
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id:
            (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
            '1029384756-demo-client-id.apps.googleusercontent.com',
          callback: async (response: any) => {
            try {
              if (response.credential) {
                await loginWithGoogle({ credential: response.credential });
              }
            } catch (err: any) {
              setError(err.message || 'Google authentication failed');
            } finally {
              setIsGoogleLoading(false);
            }
          },
        });
        window.google.accounts.id.prompt();
      } else {
        const dummyToken = `demo_google_token_${Date.now()}`;
        await loginWithGoogle({ credential: dummyToken });
      }
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neu-base text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden select-none font-sans transition-colors duration-200">
      {/* Top Floating Theme Switcher */}
      <div className="absolute top-5 right-5 sm:top-6 sm:right-8 z-30 flex items-center gap-2">
        <ThemeToggle variant="pill" />
      </div>

      {/* Main Neumorphic Portal Container */}
      <div className="relative w-full max-w-md bg-neu-surface border border-neu-border rounded-3xl shadow-neu-raised-lg overflow-hidden z-10">
        {/* Top Accent Gradient Bar */}
        <div className="h-1.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-500" />

        {/* Brand Header */}
        <div className="p-8 pb-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-neu-surface border border-neu-border flex items-center justify-center shadow-neu-raised mb-4">
            <Flame className="w-7 h-7 text-amber-500 animate-pulse" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
            Kitchen<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-500">Pulse</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Autonomous Multi-Tenant Kitchen Operations System
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-neu-sunken p-1 rounded-2xl border border-neu-borderSubtle shadow-neu-inset-sm mt-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-glow-sky border border-sky-400/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-glow-sky border border-sky-400/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Register Hotel / Team
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mx-8 mb-4 p-3 bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in shadow-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleAuth} className="p-8 pt-2 space-y-4">
          {mode === 'signup' && (
            <>
              {/* Registration Category Selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-neu-sunken rounded-xl border border-neu-borderSubtle shadow-neu-inset-sm">
                <button
                  type="button"
                  onClick={() => setSignupType('new_org')}
                  className={`py-2 px-2 text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    signupType === 'new_org'
                      ? 'bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span>New Hotel (Owner)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignupType('join_org')}
                  className={`py-2 px-2 text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    signupType === 'join_org'
                      ? 'bg-sky-500/25 text-sky-800 dark:text-sky-300 border border-sky-500/40 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-sky-500" />
                  <span>Join Team</span>
                </button>
              </div>

              {/* Organization Fields */}
              {signupType === 'new_org' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Hotel or Restaurant Group Name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. The Ritz London, Bistro Bella"
                      className="w-full bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Select Organization to Join *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-sky-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      className="w-full bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id} className="bg-neu-surface text-slate-900 dark:text-white">
                          {org.name} ({org.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Your Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Chef Marco Pierre"
                    className="w-full bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Role Selector (Join Org only) */}
              {signupType === 'join_org' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Assigned Kitchen Role
                  </label>
                  <div className="relative">
                    <ChefHat className="w-4 h-4 text-sky-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <option value="Admin" className="bg-neu-surface text-slate-900 dark:text-white">Admin (Operations Manager)</option>
                      <option value="Executive Chef" className="bg-neu-surface text-slate-900 dark:text-white">Executive Chef</option>
                      <option value="Sous Chef" className="bg-neu-surface text-slate-900 dark:text-white">Sous Chef</option>
                      <option value="Line Cook" className="bg-neu-surface text-slate-900 dark:text-white">Line Cook / Station Lead</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="chef@kitchenpulse.io"
                className="w-full bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 font-mono"
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
                className="w-full bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 font-mono"
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

          {/* Confirm Password (Signup only) */}
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
                  className="w-full bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-glow-sky transition-all active:scale-[0.98] disabled:opacity-50 mt-2 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In to Dashboard' : 'Complete Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Google Sign-in */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-neu-surface hover:bg-neu-hover border border-neu-border text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all shadow-neu-raised-sm hover:shadow-neu-raised active:shadow-neu-inset-sm cursor-pointer"
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
            <span>Sign In with Google</span>
          </button>
        </form>

        {/* Quick Demo Accounts Banner for Instant Verification */}
        <div className="bg-neu-sunken border-t border-neu-borderSubtle p-4 shadow-neu-inset-sm">
          <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider text-center mb-2.5">
            ⚡ Quick Demo Accounts (1-Click Switch)
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('owner@grandpalace.com')}
              className="p-2.5 rounded-xl bg-neu-surface hover:bg-neu-hover border border-amber-500/30 hover:border-amber-500/60 text-left transition-all shadow-neu-raised-sm hover:shadow-neu-raised active:shadow-neu-inset-sm group cursor-pointer"
            >
              <div className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                Grand Palace (Owner)
              </div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">owner@grandpalace.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin@grandpalace.com')}
              className="p-2.5 rounded-xl bg-neu-surface hover:bg-neu-hover border border-sky-500/30 hover:border-sky-500/60 text-left transition-all shadow-neu-raised-sm hover:shadow-neu-raised active:shadow-neu-inset-sm group cursor-pointer"
            >
              <div className="font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-sky-500" />
                Grand Palace (Admin)
              </div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">admin@grandpalace.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('owner@bellanapoli.com')}
              className="p-2.5 rounded-xl bg-neu-surface hover:bg-neu-hover border border-emerald-500/30 hover:border-emerald-500/60 text-left transition-all shadow-neu-raised-sm hover:shadow-neu-raised active:shadow-neu-inset-sm group cursor-pointer"
            >
              <div className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-emerald-500" />
                Bella Napoli (Owner)
              </div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">owner@bellanapoli.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('cook@grandpalace.com')}
              className="p-2.5 rounded-xl bg-neu-surface hover:bg-neu-hover border border-neu-border text-left transition-all shadow-neu-raised-sm hover:shadow-neu-raised active:shadow-neu-inset-sm group cursor-pointer"
            >
              <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <ChefHat className="w-3.5 h-3.5 text-slate-500" />
                Line Cook (Cook)
              </div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">cook@grandpalace.com</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AuthPortal;
