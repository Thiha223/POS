import React, { useRef, useState } from 'react';
import {
  Store, Eye, EyeOff, ShoppingBag, ArrowRight, ArrowLeft,
  CheckCircle, Sparkles, Mail, Lock, Building2, MailCheck,
  AlertCircle, KeyRound, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

/* ─── Shared helpers ─────────────────────────────────────── */
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="mb-4 p-3 bg-danger-600/10 border border-danger-600/30 rounded-xl flex items-start gap-2.5 text-danger-400 text-sm">
      <AlertCircle size={15} className="shrink-0 mt-0.5" />
      {msg}
    </div>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-8">
      <div
        className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[...Array(total)].map((_, i) => {
        const done = i + 1 < step;
        const active = i + 1 === step;
        return (
          <React.Fragment key={i}>
            <div
              className={`transition-all duration-300 rounded-full flex items-center justify-center font-medium text-xs ${
                done
                  ? 'w-6 h-6 bg-accent-500 text-white'
                  : active
                  ? 'w-6 h-6 bg-primary-600 text-white ring-4 ring-primary-600/20'
                  : 'w-6 h-6 bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {done ? <CheckCircle size={13} /> : i + 1}
            </div>
            {i < total - 1 && (
              <div className={`h-px w-8 transition-all duration-500 ${done ? 'bg-accent-500' : 'bg-slate-700'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── OTP Input (6 individual boxes) ───────────────────────── */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');

  const update = (idx: number, char: string) => {
    const newVal = digits.map((d, i) => (i === idx ? char : d)).join('').replace(/\s/g, '');
    onChange(newVal.slice(0, 6));
    if (char && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        update(idx, '');
      } else if (idx > 0) {
        inputs.current[idx - 1]?.focus();
        update(idx - 1, '');
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    inputs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {[...Array(6)].map((_, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] === ' ' ? '' : digits[i]}
          onChange={e => {
            const char = e.target.value.replace(/\D/g, '').slice(-1);
            update(i, char);
          }}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          className={`w-11 h-14 text-center text-xl font-bold rounded-xl border bg-surface-300 text-white
            transition-all duration-200 outline-none
            ${digits[i] && digits[i] !== ' '
              ? 'border-primary-500 ring-2 ring-primary-500/30 bg-primary-600/10'
              : 'border-slate-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
            }`}
        />
      ))}
    </div>
  );
}

/* ─── Step 3: OTP Verification ──────────────────────────────── */
function OtpStep({
  email,
  shopName,
  onBack,
}: {
  email: string;
  shopName: string;
  onBack: () => void;
}) {
  const { verifyOtp } = useAuth();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error } = await verifyOtp(email, otp, shopName);
      if (error) {
        setError(error.message);
        setOtp('');
        return;
      }
      // Success — clear all error state. AuthContext sets the session/user,
      // and App.tsx redirects to the dashboard automatically.
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResent(false);
    setError('');
    // Re-trigger signUp with same email; Supabase re-sends the OTP
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) {
      setError('Could not resend code: ' + error.message);
    } else {
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Hero icon */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center shadow-2xl shadow-primary-600/30">
            <KeyRound size={34} className="text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-7 h-7 bg-accent-500 rounded-full flex items-center justify-center shadow-lg">
            <MailCheck size={13} className="text-white" />
          </div>
        </div>
      </div>

      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-white">Verify Your Email</h2>
        <p className="text-slate-400 mt-1 font-myanmar text-sm">အီးမေးလ် အတည်ပြုပါ</p>
      </div>

      {/* Email chip */}
      <div className="flex justify-center mb-5">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600/10 border border-primary-600/30 rounded-xl">
          <Mail size={13} className="text-primary-400 shrink-0" />
          <span className="text-primary-300 font-semibold text-sm break-all">{email}</span>
        </div>
      </div>

      <p className="text-slate-400 text-sm text-center mb-6 leading-relaxed">
        We sent a <span className="text-white font-semibold">6-digit verification code</span> to your email.
        Enter it below to activate your account.
        <br />
        <span className="text-xs font-myanmar text-slate-500 mt-1 block">
          ၆-လုံး ကုဒ်နံပါတ်ကို အောက်တွင် ထည့်သွင်းပါ
        </span>
      </p>

      {error && <ErrorBanner msg={error} />}

      {resent && (
        <div className="mb-4 p-3 bg-accent-600/10 border border-accent-600/30 rounded-xl flex items-center gap-2 text-accent-400 text-sm">
          <CheckCircle size={15} className="shrink-0" />
          New code sent! Check your inbox.
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-6">
        <OtpInput value={otp} onChange={setOtp} />

        <button
          type="submit"
          disabled={loading || otp.length < 6}
          className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Spinner />Verifying...</>
          ) : (
            <><CheckCircle size={16} />Verify &amp; Create Shop</>
          )}
        </button>
      </form>

      {/* Resend + Back */}
      <div className="mt-5 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft size={14} />
          Change email
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="flex items-center gap-1.5 text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50"
        >
          {resending ? <Spinner /> : <RefreshCw size={13} />}
          Resend code
        </button>
      </div>

      <p className="text-center text-xs text-slate-600 mt-4">
        Check your spam folder if you don't see it within a minute.
      </p>
    </div>
  );
}

/* ─── Login Form ─────────────────────────────────────────── */
function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const { signIn, verifySignInOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOtpSent(true);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    setError('');
    setLoading(true);
    const { error } = await verifySignInOtp(email, otp);
    setLoading(false);
    if (error) {
      setError(error.message);
      setOtp('');
      return;
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResent(false);
    setError('');
    const { error } = await signIn(email);
    setResending(false);
    if (error) {
      setError('Could not resend code: ' + error.message);
    } else {
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    }
  };

  if (otpSent) {
    return (
      <div className="animate-fade-in">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center shadow-2xl shadow-primary-600/30">
              <KeyRound size={34} className="text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-7 h-7 bg-accent-500 rounded-full flex items-center justify-center shadow-lg">
              <MailCheck size={13} className="text-white" />
            </div>
          </div>
        </div>

        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold text-white">Enter verification code</h2>
          <p className="text-slate-400 mt-1 font-myanmar text-sm">အတည်ပြုကုဒ် ထည့်သွင်းပါ</p>
        </div>

        <div className="flex justify-center mb-5">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600/10 border border-primary-600/30 rounded-xl">
            <Mail size={13} className="text-primary-400 shrink-0" />
            <span className="text-primary-300 font-semibold text-sm break-all">{email}</span>
          </div>
        </div>

        <p className="text-slate-400 text-sm text-center mb-6 leading-relaxed">
          We sent a <span className="text-white font-semibold">6-digit verification code</span> to your email.
          <br />
          <span className="text-xs font-myanmar text-slate-500 mt-1 block">
            ၆-လုံး ကုဒ်နံပါတ်ကို အောက်တွင် ထည့်သွင်းပါ
          </span>
        </p>

        {error && <ErrorBanner msg={error} />}

        {resent && (
          <div className="mb-4 p-3 bg-accent-600/10 border border-accent-600/30 rounded-xl flex items-center gap-2 text-accent-400 text-sm">
            <CheckCircle size={15} className="shrink-0" />
            New code sent! Check your inbox.
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <OtpInput value={otp} onChange={setOtp} />

          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Spinner />Verifying...</>
            ) : (
              <><CheckCircle size={16} />Sign In</>
            )}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft size={14} />
            Change email
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-1.5 text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50"
          >
            {resending ? <Spinner /> : <RefreshCw size={13} />}
            Resend code
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Check your spam folder if you don't see it within a minute.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Welcome back</h2>
        <p className="text-slate-400 mt-1 font-myanmar text-sm">သင်၏အကောင့်သို့ ဝင်ရောက်ပါ</p>
      </div>

      {error && <ErrorBanner msg={error} />}

      <form onSubmit={handleSendCode} className="space-y-4">
        <div>
          <label className="label">Email Address</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="input-field pl-9"
              required autoFocus
            />
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="btn-primary w-full py-3 text-base mt-2 flex items-center justify-center gap-2">
          {loading ? <><Spinner />Sending code...</> : <><Mail size={16} />Send Login Code</>}
        </button>
      </form>

      <p className="text-center text-slate-400 text-sm mt-6">
        Don't have an account?{' '}
        <button onClick={onSwitch} className="text-primary-400 hover:text-primary-300 font-medium">
          Create one free
        </button>
      </p>
    </div>
  );
}

/* ─── Step 1: Shop Info ──────────────────────────────────── */
function Step1({
  shopName, setShopName, shopNameMm, setShopNameMm, onNext,
}: {
  shopName: string; setShopName: (v: string) => void;
  shopNameMm: string; setShopNameMm: (v: string) => void;
  onNext: () => void;
}) {
  const [touched, setTouched] = useState(false);
  const invalid = touched && !shopName.trim();

  const handleNext = () => {
    setTouched(true);
    if (shopName.trim()) onNext();
  };

  return (
    <div className="animate-slide-up">
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-2xl shadow-primary-600/30">
            <Building2 size={44} className="text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-7 h-7 bg-accent-500 rounded-full flex items-center justify-center shadow-lg">
            <Sparkles size={14} className="text-white" />
          </div>
        </div>
      </div>

      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white">Name your shop</h2>
        <p className="text-slate-400 mt-1 font-myanmar text-sm">သင်၏ဆိုင်အမည်ကို ထည့်သွင်းပါ</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label">Shop Name (English) *</label>
          <div className="relative">
            <Store size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text" value={shopName}
              onChange={e => setShopName(e.target.value)}
              placeholder="e.g. Ko Ko General Store"
              className={`input-field pl-9 ${invalid ? 'border-danger-500' : ''}`}
              autoFocus
            />
          </div>
          {invalid && <p className="mt-1 text-xs text-danger-400">Shop name is required</p>}
        </div>

        <div>
          <label className="label">
            ဆိုင်အမည် (မြန်မာ) <span className="text-slate-500 font-normal ml-1">(optional)</span>
          </label>
          <input
            type="text" value={shopNameMm}
            onChange={e => setShopNameMm(e.target.value)}
            placeholder="e.g. ကိုကို ကုန်စုံဆိုင်"
            className="input-field font-myanmar"
          />
        </div>

        {shopName.trim() && (
          <div className="flex items-center gap-3 p-3 bg-primary-600/10 border border-primary-600/20 rounded-xl animate-fade-in">
            <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center shrink-0">
              <Store size={18} className="text-primary-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{shopName}</p>
              {shopNameMm && <p className="text-xs font-myanmar text-primary-300 truncate">{shopNameMm}</p>}
            </div>
            <CheckCircle size={18} className="text-accent-400 shrink-0 ml-auto" />
          </div>
        )}

        <button
          type="button"
          onClick={() => handleNext()}
          className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2 mt-2"
        >
          Continue <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ─── Step 2: Account Credentials ───────────────────────── */
function Step2({
  shopName, shopNameMm, onBack, onOtpSent,
}: {
  shopName: string;
  shopNameMm: string;
  onBack: () => void;
  onOtpSent: (email: string) => void;
}) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const strength = password.length >= 12 ? 4 : password.length >= 10 ? 3 : password.length >= 8 ? 2 : password.length > 0 ? 1 : 0;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-danger-500', 'bg-warning-500', 'bg-blue-500', 'bg-accent-500'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const { error } = await signUp(email, password, shopName);
    setLoading(false);
    if (error) { setError(error.message); return; }
    onOtpSent(email);
  };

  return (
    <div className="animate-slide-in-right">
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-accent-600 to-primary-700 flex items-center justify-center shadow-2xl shadow-accent-600/20">
            <Lock size={40} className="text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center shadow-lg">
            <Mail size={13} className="text-white" />
          </div>
        </div>
      </div>

      <div className="mb-5 text-center">
        <h2 className="text-2xl font-bold text-white">Create your account</h2>
        <p className="text-slate-400 mt-1 font-myanmar text-sm">အီးမေးလ်နှင့် စကားဝှက် ထည့်သွင်းပါ</p>
      </div>

      {/* Shop recap */}
      <div className="flex items-center gap-2 p-2.5 bg-surface-300 rounded-xl mb-5 border border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center shrink-0">
          <Store size={14} className="text-primary-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">Shop</p>
          <p className="text-sm font-semibold text-white truncate leading-tight">{shopName}</p>
          {shopNameMm && <p className="text-xs font-myanmar text-slate-400 truncate">{shopNameMm}</p>}
        </div>
        <button type="button" onClick={onBack}
          className="text-xs text-primary-400 hover:text-primary-300 font-medium shrink-0">
          Edit
        </button>
      </div>

      {error && <ErrorBanner msg={error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="label">Email Address</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="input-field pl-9"
              required autoFocus
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="input-field pl-9 pr-10"
              required minLength={8}
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {strength > 0 && (
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : 'bg-slate-700'}`}
                />
              ))}
              <span className="text-xs text-slate-500 ml-1">{strengthLabel}</span>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="label">Confirm Password</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className={`input-field pl-9 pr-10 ${
                passwordMismatch ? 'border-danger-500 focus:border-danger-500' : confirmPassword && !passwordMismatch ? 'border-accent-500' : ''
              }`}
              required
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {passwordMismatch && (
            <p className="mt-1 text-xs text-danger-400 flex items-center gap-1">
              <AlertCircle size={12} />
              Passwords do not match.
            </p>
          )}
          {confirmPassword && !passwordMismatch && (
            <p className="mt-1 text-xs text-accent-400 flex items-center gap-1">
              <CheckCircle size={12} />
              Passwords match!
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || passwordMismatch}
          className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Spinner />Sending code...</>
          ) : (
            <><ShoppingBag size={16} />Create My Shop</>
          )}
        </button>
      </form>
    </div>
  );
}

/* ─── Left Panel ─────────────────────────────────────────── */
const STEP_PANELS = [
  {
    headline: 'Your shop,\nyour identity.',
    headlineMm: 'သင်၏ဆိုင်ကို စတင်ပါ',
    sub: 'Give your shop a name that customers will remember. You can always update it later.',
    icon: <Building2 size={52} className="text-white" />,
    bg: 'from-primary-900 via-primary-800 to-surface-50',
  },
  {
    headline: 'Secure your\naccount.',
    headlineMm: 'အကောင့်ကို လုံခြုံစေပါ',
    sub: 'Your email and password protect your shop data. Use a strong, unique password.',
    icon: <Lock size={52} className="text-white" />,
    bg: 'from-slate-900 via-primary-900 to-accent-600/30',
  },
  {
    headline: 'One last step.',
    headlineMm: 'နောက်ဆုံးအဆင့်',
    sub: 'Enter the 6-digit code from your email to activate your account and open your shop.',
    icon: <KeyRound size={52} className="text-white" />,
    bg: 'from-slate-900 via-accent-900/40 to-primary-800',
  },
];

function LeftPanel({ panelIndex }: { panelIndex: number }) {
  const panel = STEP_PANELS[panelIndex] || STEP_PANELS[0];
  return (
    <div className={`hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br ${panel.bg} p-12 relative overflow-hidden transition-all duration-500`}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-16 left-8 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-24 right-8 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-11 h-11 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg">
          <ShoppingBag size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white leading-none">ဈေးဆိုင်စာရင်း</h1>
          <p className="text-primary-300 text-xs">Zay Saing Sa Yin</p>
        </div>
      </div>
      <div className="relative z-10">
        <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8 border border-white/20">
          {panel.icon}
        </div>
        <h2 className="text-4xl font-bold text-white leading-tight mb-3 whitespace-pre-line">{panel.headline}</h2>
        <p className="text-primary-200 font-myanmar text-base leading-relaxed">{panel.headlineMm}</p>
        <p className="text-primary-300/70 text-sm mt-4 leading-relaxed">{panel.sub}</p>
      </div>
      <div className="relative z-10 flex flex-wrap gap-2">
        {['Myanmar Unicode', 'KPay / Wave', 'Barcode Scan', 'Export CSV'].map(tag => (
          <span key={tag} className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-medium text-white/80 border border-white/20">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Main AuthPage ──────────────────────────────────────── */
export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  // register sub-screens: 'shop' | 'credentials' | 'otp'
  const [regScreen, setRegScreen] = useState<'shop' | 'credentials' | 'otp'>('shop');
  const [shopName, setShopName] = useState('');
  const [shopNameMm, setShopNameMm] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  const switchToRegister = () => { setMode('register'); setRegScreen('shop'); };
  const switchToLogin = () => {
    setMode('login');
    setRegScreen('shop');
    setShopName('');
    setShopNameMm('');
    setPendingEmail('');
  };

  // Map register screens to step dots (shop=1, credentials=2, otp=3)
  const regStepMap = { shop: 1, credentials: 2, otp: 3 };
  const TOTAL_STEPS = 3;
  const currentStep = regStepMap[regScreen];

  // Left panel index: login→0, shop→0, credentials→1, otp→2
  const panelIndex = mode === 'login' ? 0 : currentStep - 1;

  return (
    <div className="min-h-screen bg-surface-DEFAULT flex">
      <LeftPanel panelIndex={panelIndex} />

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-11 h-11 bg-primary-600 rounded-2xl flex items-center justify-center">
              <ShoppingBag size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">ဈေးဆိုင်စာရင်း</h1>
              <p className="text-slate-400 text-xs">Zay Saing Sa Yin</p>
            </div>
          </div>

          <div className="card">
            {mode === 'register' ? (
              <>
                <ProgressBar step={currentStep} total={TOTAL_STEPS} />
                <div className="flex items-center justify-between mb-2">
                  <StepDots step={currentStep} total={TOTAL_STEPS} />
                  <span className="text-xs text-slate-500 mb-6">Step {currentStep} of {TOTAL_STEPS}</span>
                </div>

                {regScreen === 'shop' && (
                  <Step1
                    shopName={shopName} setShopName={setShopName}
                    shopNameMm={shopNameMm} setShopNameMm={setShopNameMm}
                    onNext={() => setRegScreen('credentials')}
                  />
                )}

                {regScreen === 'credentials' && (
                  <Step2
                    shopName={shopName} shopNameMm={shopNameMm}
                    onBack={() => setRegScreen('shop')}
                    onOtpSent={(email) => { setPendingEmail(email); setRegScreen('otp'); }}
                  />
                )}

                {regScreen === 'otp' && (
                  <OtpStep
                    email={pendingEmail}
                    shopName={shopName}
                    onBack={() => setRegScreen('credentials')}
                  />
                )}

                <p className="text-center text-slate-400 text-sm mt-6 border-t border-slate-800 pt-5">
                  Already have an account?{' '}
                  <button onClick={switchToLogin} className="text-primary-400 hover:text-primary-300 font-medium">
                    Sign in
                  </button>
                </p>
              </>
            ) : (
              <LoginForm onSwitch={switchToRegister} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
