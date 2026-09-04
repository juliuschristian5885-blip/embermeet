import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { LandingPage } from '@/components/LandingPage';
import { HelpCenterPage } from '@/components/HelpCenterPage';
import { Navbar } from '@/components/Navbar';
import { BrowsePage } from '@/components/BrowsePage';
import { ProfilePage } from '@/components/ProfilePage';
import { MessagingPage } from '@/components/MessagingPage';
import { AdminPage } from '@/components/AdminPage';
import { ActivityPage } from '@/components/ActivityPage';
import { ReportModal } from '@/components/ReportModal';
import { SettingsPage } from '@/components/SettingsPage';
import type { Profile } from '@/lib/types';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [page, setPage] = useState('browse');
  const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);
  const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<Profile | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-100 dark:bg-charcoal-900">
        <Loader2 size={32} className="animate-spin text-terracotta-400" />
      </div>
    );
  }

  // Not signed in → landing page (or help center)
  if (!user || !profile) {
    if (page === 'help') {
      return <HelpCenterPage onNavigate={setPage} />;
    }
    return <LandingPage onNavigate={setPage} />;
  }

  // Banned user
  if (profile.is_banned) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-8 text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <Loader2 size={32} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-charcoal-700 dark:text-cream-100 mb-2">
            Account suspended
          </h1>
          <p className="text-sm text-charcoal-500 dark:text-cream-400 mb-4">
            Your account has been banned. Please contact support if you believe this is an error.
          </p>
          <button
            onClick={() => {
              supabase.auth.signOut();
            }}
            className="btn-secondary"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const handleOpenProfile = (p: Profile) => {
    setViewingProfile(p);
    setPage('profile');
  };

  const handleStartChat = (partnerId: string) => {
    setChatPartnerId(partnerId);
    setPage('messages');
  };

  const handleNavigate = (target: string) => {
    if (target === 'profile') {
      setViewingProfile(profile);
    }
    setPage(target);
  };

  return (
    <>
      <Navbar currentPage={page} onNavigate={handleNavigate} />

      <div key={page} className="animate-fade-in">
        {page === 'browse' && (
          <BrowsePage
            onOpenProfile={handleOpenProfile}
            onReport={(p) => setReportTarget(p)}
          />
        )}

        {page === 'help' && <HelpCenterPage onNavigate={handleNavigate} />}

        {page === 'profile' && (
          <ProfilePage
            profile={viewingProfile}
            isOwn={viewingProfile?.id === profile.id}
            onBack={() => setPage('browse')}
            onStartChat={handleStartChat}
            onReport={(p) => setReportTarget(p)}
          />
        )}

        {page === 'messages' && (
          <MessagingPage
            initialPartnerId={chatPartnerId}
            onOpenProfile={handleOpenProfile}
          />
        )}

        {page === 'activity' && (
          <ActivityPage
            onOpenProfile={handleOpenProfile}
            onStartChat={handleStartChat}
          />
        )}

        {page === 'admin' && <AdminPage />}

        {page === 'settings' && (
          <SettingsPage
            onBack={() => setPage('browse')}
            onOpenProfile={handleOpenProfile}
          />
        )}
      </div>

      <ReportModal
        profile={reportTarget}
        isOpen={reportTarget !== null}
        onClose={() => setReportTarget(null)}
      />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
