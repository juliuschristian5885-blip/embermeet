import { useState } from 'react';
import { Modal } from './Modal';
import { useAuth } from '@/lib/auth';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialMode = 'signup' }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup') {
      if (!ageConfirmed) {
        setError('You must confirm that you are 18 or older.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
    }

    setLoading(true);
    const result =
      mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-terracotta-400 to-ember-600 shadow-lg shadow-terracotta-400/20 mb-3">
          <FlameIcon />
        </div>
        <h2 className="text-2xl font-bold text-charcoal-700 dark:text-cream-100">
          {mode === 'signin' ? 'Welcome back' : 'Join Ember'}
        </h2>
        <p className="text-sm text-charcoal-400 dark:text-cream-400 mt-1">
          {mode === 'signin'
            ? 'Sign in to continue your connections'
            : 'Where sparks become connections'}
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm animate-slide-up">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-1.5">
            Email
          </label>
          <div className="relative">
            <Mail
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 dark:text-cream-500"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="input-field pl-11"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 dark:text-cream-500"
            />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
              className="input-field pl-11 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 dark:text-cream-500 hover:text-terracotta-400 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {mode === 'signup' && (
          <label className="flex items-start gap-3 cursor-pointer group">
            <div
              className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-md border-2 transition-all ${
                ageConfirmed
                  ? 'bg-terracotta-400 border-terracotta-400'
                  : 'border-charcoal-300 dark:border-charcoal-500 group-hover:border-terracotta-400'
              }`}
            >
              {ageConfirmed && <ShieldCheck size={14} className="text-white" />}
            </div>
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="sr-only"
            />
            <span className="text-sm text-charcoal-600 dark:text-cream-300">
              I confirm that I am <strong>18 years or older</strong> and agree to arrange any
              meetings privately at my own risk. Ember does not verify meetups or process
              payments.
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : mode === 'signin' ? (
            'Sign In'
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-charcoal-500 dark:text-cream-400">
        {mode === 'signin' ? (
          <>
            New to Ember?{' '}
            <button
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className="font-semibold text-terracotta-500 hover:text-terracotta-600 transition-colors"
            >
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className="font-semibold text-terracotta-500 hover:text-terracotta-600 transition-colors"
            >
              Sign in
            </button>
          </>
        )}
      </div>

      {mode === 'signin' && (
        <div className="mt-4 p-3 rounded-xl bg-ember-50 dark:bg-ember-900/10 border border-ember-200 dark:border-ember-800/30 text-xs text-ember-700 dark:text-ember-400 text-center">
          Demo admin: <strong>admin@ember.com</strong> / <strong>admin123456</strong>
        </div>
      )}
    </Modal>
  );
}

function FlameIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cream-50">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}
