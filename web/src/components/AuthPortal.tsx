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
        setError('Please enter the name of your Hotel or Restaurant.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login({ email: email.trim().toLowerCase(), password });
      } else {
        const payloadRole = signupType === 'new_org' ? 'Owner' : role;
        await signup({
          name: name.trim() || email.split('@')[0],
          email: email.trim().toLowerCase(),
          password,
          role: payloadRole,
          organization_id: signupType === 'join_org' ? selectedOrgId : undefined,
          organization_name: signupType === 'new_org' ? orgName.trim() : undefined,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setError(null);
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
      const promptEmail = window.prompt(
        'Enter your Google account email to sign in (or use default chef account):',
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
        name: extractedName,
        picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(extractedName)}&backgroundColor=0284c7`,
        googleId: `google-user-${Date.now()}`,
        organization_id: selectedOrgId || undefined,
        role: 'Executive Chef',
      });
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden select-none font-sans">
      {/* Background Ambience & Grid Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Portal Container */}
      <div className="relative w-full max-w-md bg-bg-surface border border-slate-700/80 rounded-3xl shadow-2xl shadow-sky-950/70 overflow-hidden backdrop-blur-xl z-10">
        {/* Top Accent Gradient Bar */}
        <div className="h-1.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-500" />

        {/* Brand Header */}
        <div className="p-8 pb-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-amber-500 p-0.5 shadow-xl shadow-sky-950/60 mb-4">
            <div className="w-full h-full bg-bg-surface rounded-[14px] flex items-center justify-center">
              <Flame className="w-7 h-7 text-amber-400" />
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white">
            Kitchen<span className="text-sky-400">Pulse</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous Multi-Tenant Kitchen Operations System
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-bg-primary p-1 rounded-xl border border-bg-border mt-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200'
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
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register Hotel / Team
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mx-8 mb-4 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleAuth} className="p-8 pt-2 space-y-4">
          {mode === 'signup' && (
            <>
              {/* Registration Category Selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-bg-card rounded-xl border border-bg-border">
                <button
                  type="button"
                  onClick={() => setSignupType('new_org')}
                  className={`py-2 px-2 text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                    signupType === 'new_org'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>New Hotel (Owner)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignupType('join_org')}
                  className={`py-2 px-2 text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                    signupType === 'join_org'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  <span>Join Team (Admin/Staff)</span>
                </button>
              </div>

              {/* Organization Field based on selection */}
              {signupType === 'new_org' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-amber-300 uppercase tracking-wider mb-1.5">
                    Hotel / Restaurant Client Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. The Royal Grand Hotel & Spa"
                      className="w-full bg-bg-card border border-amber-500/40 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    You will be assigned the <span className="text-amber-400 font-semibold">Owner</span> role with full access to all stock, users & reports.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Select Hotel / Client Organization
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <select
                        value={selectedOrgId}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        className="w-full bg-bg-card border border-bg-border focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                      >
                        {organizations.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name} ({o.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Assigned Role
                    </label>
                    <div className="relative">
                      <Shield className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full bg-bg-card border border-bg-border focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                      >
                        <option value="Admin">Admin (Full User & Stock Access)</option>
                        <option value="Executive Chef">Executive Chef</option>
                        <option value="Sous Chef">Sous Chef</option>
                        <option value="Line Cook">Line Cook</option>
                        <option value="Station Lead">Station Lead</option>
                        <option value="Kitchen Manager">Kitchen Manager</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Your Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Marco Pierre White"
                    className="w-full bg-bg-card border border-bg-border focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="chef@kitchenpulse.io"
                className="w-full bg-bg-card border border-bg-border focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              {mode === 'signup' && (
                <span className="text-[10px] text-slate-500">Min 6 characters</span>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-bg-card border border-bg-border focus:border-sky-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (Signup only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-bg-card border border-bg-border focus:border-sky-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-900/40 hover:shadow-sky-800/60 transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
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
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-bg-card hover:bg-bg-hover border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
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
        <div className="bg-bg-card/70 border-t border-bg-border p-4">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider text-center mb-2.5">
            ⚡ Quick Demo Accounts (1-Click Switch)
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('owner@grandpalace.com')}
              className="p-2 rounded-lg bg-bg-surface hover:bg-bg-hover border border-amber-500/30 text-left transition-colors"
            >
              <div className="font-bold text-amber-300 flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-400" />
                Grand Palace (Owner)
              </div>
              <div className="text-[9px] text-slate-400 font-mono">owner@grandpalace.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin@grandpalace.com')}
              className="p-2 rounded-lg bg-bg-surface hover:bg-bg-hover border border-sky-500/30 text-left transition-colors"
            >
              <div className="font-bold text-sky-300 flex items-center gap-1">
                <Shield className="w-3 h-3 text-sky-400" />
                Grand Palace (Admin)
              </div>
              <div className="text-[9px] text-slate-400 font-mono">admin@grandpalace.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('owner@bellanapoli.com')}
              className="p-2 rounded-lg bg-bg-surface hover:bg-bg-hover border border-emerald-500/30 text-left transition-colors"
            >
              <div className="font-bold text-emerald-300 flex items-center gap-1">
                <Crown className="w-3 h-3 text-emerald-400" />
                Bella Napoli (Owner)
              </div>
              <div className="text-[9px] text-slate-400 font-mono">owner@bellanapoli.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('cook@grandpalace.com')}
              className="p-2 rounded-lg bg-bg-surface hover:bg-bg-hover border border-slate-700 text-left transition-colors"
            >
              <div className="font-bold text-slate-300 flex items-center gap-1">
                <ChefHat className="w-3 h-3 text-slate-400" />
                Line Cook (Cook)
              </div>
              <div className="text-[9px] text-slate-400 font-mono">cook@grandpalace.com</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AuthPortal;
