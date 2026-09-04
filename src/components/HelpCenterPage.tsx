import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Logo } from './Logo';
import {
  Moon,
  Sun,
  ChevronDown,
  HelpCircle,
  Mail,
  Shield,
  ArrowLeft,
  Flag,
  Ban,
  Trash2,
  CreditCard,
  Image as ImageIcon,
  Lock,
  AlertTriangle,
} from 'lucide-react';

interface HelpCenterPageProps {
  onNavigate: (page: string) => void;
}

export function HelpCenterPage({ onNavigate }: HelpCenterPageProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      icon: <Flag size={18} />,
      question: 'How do I report someone?',
      answer:
        'Open the user\'s profile and tap the "Report" button, or use the report icon on any profile card in the browse page. Choose a reason and add any details you think are relevant. Our admin team reviews every report promptly. You can also block the user at the same time to prevent further contact.',
    },
    {
      icon: <Ban size={18} />,
      question: 'How do I block someone?',
      answer:
        'You can block a user from their profile page or directly from their profile card on the browse page. Once blocked, they will no longer appear in your browse results and cannot send you messages. You can unblock them at any time from their profile page.',
    },
    {
      icon: <Trash2 size={18} />,
      question: 'How do I delete my account?',
      answer:
        'To delete your account, sign out and contact our support team at support@ember.com. Your profile, photos, and messages will be permanently removed. This action cannot be undone, so please be certain before requesting deletion.',
    },
    {
      icon: <CreditCard size={18} />,
      question: 'Is Ember free to use?',
      answer:
        'Yes, Ember is free to use. There are no payments, subscriptions, or hidden fees. We do not process payments of any kind and do not facilitate bookings or transactions between users.',
    },
    {
      icon: <ImageIcon size={18} />,
      question: 'How does photo moderation work?',
      answer:
        'Photos you upload are visible immediately. However, our admin team actively monitors all uploaded photos and can remove any that violate our community guidelines. If a photo is rejected, it will be hidden from your profile and you will be able to upload a replacement.',
    },
    {
      icon: <Lock size={18} />,
      question: 'How do I stay safe on Ember?',
      answer:
        'Always meet in a public place for the first time, let a friend know where you are going, trust your instincts, and never share financial information. Ember does not verify identities or vet users. All meetings are arranged at your own discretion and risk. Use the report and block features if anyone makes you uncomfortable.',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-cream-100/80 dark:bg-charcoal-900/80 backdrop-blur-lg border-b border-cream-200 dark:border-charcoal-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => onNavigate(user ? 'browse' : 'landing')} aria-label="Back to home">
            <Logo />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-cream-200 dark:hover:bg-charcoal-700 text-charcoal-500 dark:text-cream-400 transition-colors"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            {user ? (
              <button
                onClick={() => onNavigate('browse')}
                className="btn-primary text-sm py-2 px-4"
              >
                Back to app
              </button>
            ) : (
              <button
                onClick={() => onNavigate('landing')}
                className="btn-ghost text-sm flex items-center gap-1.5"
              >
                <ArrowLeft size={16} />
                Home
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-28 pb-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-terracotta-400/10 to-gold-400/10 text-terracotta-400 mb-6">
            <HelpCircle size={32} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-charcoal-700 dark:text-cream-100 mb-3">
            Help Center
          </h1>
          <p className="text-charcoal-500 dark:text-cream-400">
            Find answers to common questions about using Ember.
          </p>
        </div>
      </section>

      {/* Safety Notice */}
      <section className="px-4 sm:px-6 pb-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-gold-100/60 dark:bg-gold-900/20 border border-gold-300/40 dark:border-gold-700/30">
            <AlertTriangle size={18} className="text-gold-600 dark:text-gold-400 shrink-0" />
            <p className="text-sm text-gold-700 dark:text-gold-300 font-medium">
              18+ only. All meetings are private and arranged at your own discretion and responsibility.
            </p>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="px-4 sm:px-6 pb-16">
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                className="card overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center gap-3 p-5 text-left hover:bg-cream-50 dark:hover:bg-charcoal-700/30 transition-colors"
                >
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-terracotta-400/10 text-terracotta-400 shrink-0">
                    {faq.icon}
                  </span>
                  <span className="flex-1 font-semibold text-charcoal-700 dark:text-cream-100">
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={20}
                    className={`text-charcoal-400 dark:text-cream-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pl-[4.75rem] animate-fade-in">
                    <p className="text-sm text-charcoal-500 dark:text-cream-400 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-16 px-4 sm:px-6 bg-cream-50 dark:bg-charcoal-800/50">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-terracotta-400/10 to-gold-400/10 text-terracotta-400 mb-4">
            <Mail size={28} />
          </div>
          <h2 className="text-2xl font-bold text-charcoal-700 dark:text-cream-100 mb-2">
            Still need help?
          </h2>
          <p className="text-charcoal-500 dark:text-cream-400 mb-6">
            Our support team is here to help with any questions or concerns.
          </p>
          <a
            href="mailto:support@ember.com"
            className="btn-primary inline-flex items-center gap-2 text-base px-8 py-4"
          >
            <Mail size={18} />
            Contact Support
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-cream-200 dark:border-charcoal-700/50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-terracotta-400/10 text-terracotta-600 dark:text-terracotta-400 text-xs font-bold tracking-wide">
            <Shield size={14} />
            18+ Only
          </span>
        </div>
      </footer>
    </div>
  );
}
