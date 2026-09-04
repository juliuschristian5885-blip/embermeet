import { useState } from 'react';
import { AuthModal } from './AuthModal';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Logo } from './Logo';
import {
  Flame,
  ShieldCheck,
  MessageCircle,
  Users,
  MapPin,
  Moon,
  Sun,
  Lock,
  Ban,
  UserPlus,
  Search,
  Handshake,
  Globe,
  AlertTriangle,
  HelpCircle,
  Mail,
  FileText,
  Shield,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  const [authModal, setAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthModal(true);
  };

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-cream-100/80 dark:bg-charcoal-900/80 backdrop-blur-lg border-b border-cream-200 dark:border-charcoal-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-cream-200 dark:hover:bg-charcoal-700 text-charcoal-500 dark:text-cream-400 transition-colors"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button
              onClick={() => onNavigate('help')}
              className="btn-ghost text-sm hidden sm:flex items-center gap-1.5"
            >
              <HelpCircle size={16} />
              Help
            </button>
            {user ? (
              <button
                onClick={() => onNavigate('browse')}
                className="btn-primary text-sm py-2 px-4"
              >
                Go to app
              </button>
            ) : (
              <>
                <button onClick={() => openAuth('signin')} className="btn-ghost text-sm">
                  Sign in
                </button>
                <button onClick={() => openAuth('signup')} className="btn-primary text-sm py-2 px-4">
                  Get started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-terracotta-400/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-96 h-96 bg-gold-400/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-terracotta-400/10 text-terracotta-500 text-sm font-medium mb-6 animate-fade-in">
            <Flame size={16} />
            Premium. Discreet. Adult connections.
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-charcoal-700 dark:text-cream-100 mb-6 animate-slide-up">
            Where sparks
            <br />
            <span className="bg-gradient-to-r from-terracotta-400 via-gold-400 to-terracotta-500 bg-clip-text text-transparent">
              become connections
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-charcoal-500 dark:text-cream-400 max-w-2xl mx-auto mb-10 animate-slide-up">
            Meet adults near you. Chat privately. Arrange your own meetups.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
            <button
              onClick={() => (user ? onNavigate('browse') : openAuth('signup'))}
              className="btn-primary text-base px-8 py-4"
            >
              {user ? 'Browse profiles' : 'Start Connecting'}
            </button>
            <button
              onClick={() => (user ? onNavigate('browse') : openAuth('signin'))}
              className="btn-secondary text-base px-8 py-4"
            >
              {user ? 'View messages' : 'I have an account'}
            </button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-6 text-sm text-charcoal-400 dark:text-cream-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-terracotta-400" /> 18+ only
            </span>
            <span className="flex items-center gap-1.5">
              <Lock size={16} className="text-terracotta-400" /> Private & discreet
            </span>
            <span className="flex items-center gap-1.5">
              <Flame size={16} className="text-terracotta-400" /> Real connections
            </span>
          </div>
        </div>
      </section>

      {/* Safety Notice */}
      <section className="px-4 sm:px-6 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-gold-100/60 dark:bg-gold-900/20 border border-gold-300/40 dark:border-gold-700/30 text-center">
            <AlertTriangle size={18} className="text-gold-600 dark:text-gold-400 shrink-0" />
            <p className="text-sm text-gold-700 dark:text-gold-300 font-medium">
              18+ only. All meetings are private and arranged at your own discretion and responsibility.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 bg-cream-50 dark:bg-charcoal-800/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-charcoal-700 dark:text-cream-100 mb-3">
            How it works
          </h2>
          <p className="text-center text-charcoal-500 dark:text-cream-400 mb-14 max-w-2xl mx-auto">
            Four simple steps from signing up to meeting someone new.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <StepCard
              number={1}
              icon={<UserPlus size={24} />}
              title="Create Profile"
              description="Set up your profile with photos, interests, and a bio. It takes less than two minutes."
            />
            <StepCard
              number={2}
              icon={<Search size={24} />}
              title="Browse"
              description="Discover adults near you or around the world. Filter by age, location, and interests."
            />
            <StepCard
              number={3}
              icon={<MessageCircle size={24} />}
              title="Chat"
              description="Start a private conversation in real-time. See who's online and ready to talk."
            />
            <StepCard
              number={4}
              icon={<Handshake size={24} />}
              title="Meet"
              description="Arrange a meetup on your own terms. Every meeting is private and at your own discretion."
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-charcoal-700 dark:text-cream-100 mb-3">
            Built for safe, private connections
          </h2>
          <p className="text-center text-charcoal-500 dark:text-cream-400 mb-14 max-w-2xl mx-auto">
            Every feature is designed to help you connect with confidence.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<MessageCircle size={26} />}
              title="Real-time messaging"
              description="Chat privately in real-time. See when someone is online and when your messages are read."
            />
            <FeatureCard
              icon={<Globe size={26} />}
              title="Local & International"
              description="Find people nearby or across the globe. Distance indicators help you know who's close."
            />
            <FeatureCard
              icon={<Lock size={26} />}
              title="Discreet & Private"
              description="Your conversations stay between you and your connections. No payments, no bookings, no verification of meetups."
            />
            <FeatureCard
              icon={<Ban size={26} />}
              title="Report & Block"
              description="Report or block any user at any time. Our admin team reviews every report promptly."
            />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-4 sm:px-6 bg-cream-50 dark:bg-charcoal-800/50">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-terracotta-400/10 to-gold-400/10 text-terracotta-400 mb-6">
            <Users size={32} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-charcoal-700 dark:text-cream-100 mb-3">
            Join thousands of adults worldwide
          </h2>
          <p className="text-charcoal-500 dark:text-cream-400 mb-8">
            Ember members are connecting every day. Be part of a community that values privacy, respect, and genuine connections.
          </p>
          <button
            onClick={() => (user ? onNavigate('browse') : openAuth('signup'))}
            className="btn-primary text-base px-8 py-4"
          >
            {user ? 'Browse now' : 'Create your free account'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 border-t border-cream-200 dark:border-charcoal-700/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
            <Logo />
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              <button
                onClick={() => onNavigate('help')}
                className="text-charcoal-500 dark:text-cream-400 hover:text-terracotta-400 transition-colors flex items-center gap-1.5"
              >
                <FileText size={14} />
                Terms of Service
              </button>
              <button
                onClick={() => onNavigate('help')}
                className="text-charcoal-500 dark:text-cream-400 hover:text-terracotta-400 transition-colors flex items-center gap-1.5"
              >
                <Shield size={14} />
                Privacy Policy
              </button>
              <button
                onClick={() => onNavigate('help')}
                className="text-charcoal-500 dark:text-cream-400 hover:text-terracotta-400 transition-colors flex items-center gap-1.5"
              >
                <Mail size={14} />
                Contact Support
              </button>
              <button
                onClick={() => onNavigate('help')}
                className="text-charcoal-500 dark:text-cream-400 hover:text-terracotta-400 transition-colors flex items-center gap-1.5"
              >
                <HelpCircle size={14} />
                Help Center
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-cream-200 dark:border-charcoal-700/50">
            <p className="text-xs text-charcoal-400 dark:text-cream-500 text-center sm:text-left">
              Ember is for adults 18+ only. All meetings are arranged privately at users' own risk.
              <br />
              No payments, bookings, or verification of meetups.
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-terracotta-400/10 text-terracotta-600 dark:text-terracotta-400 text-xs font-bold tracking-wide shrink-0">
              <ShieldCheck size={14} />
              18+ Only
            </span>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={authModal}
        onClose={() => setAuthModal(false)}
        initialMode={authMode}
      />
    </div>
  );
}

function StepCard({
  number,
  icon,
  title,
  description,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative text-center animate-slide-up">
      <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-terracotta-400/15 to-gold-400/15 text-terracotta-400 mb-4">
        {icon}
        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-terracotta-400 text-white text-xs font-bold flex items-center justify-center shadow-md">
          {number}
        </span>
      </div>
      <h3 className="text-lg font-bold text-charcoal-700 dark:text-cream-100 mb-2">{title}</h3>
      <p className="text-sm text-charcoal-500 dark:text-cream-400">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-terracotta-400/10 to-gold-400/10 text-terracotta-400 mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-charcoal-700 dark:text-cream-100 mb-2">{title}</h3>
      <p className="text-sm text-charcoal-500 dark:text-cream-400">{description}</p>
    </div>
  );
}
