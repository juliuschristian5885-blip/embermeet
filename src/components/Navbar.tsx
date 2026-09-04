import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { Logo } from './Logo';
import {
  Moon,
  Sun,
  Compass,
  MessageCircle,
  User,
  Shield,
  LogOut,
  Menu,
  X,
  HelpCircle,
  Heart,
  Settings,
} from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activityCount, setActivityCount] = useState(0);

  useEffect(() => {
    if (!profile) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', profile.id)
        .is('read_at', null);
      setUnreadCount(count || 0);
    };

    const fetchActivityCount = async () => {
      const { count: likeCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('liked_id', profile.id);
      const { count: viewCount } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('viewed_id', profile.id);
      setActivityCount((likeCount || 0) + (viewCount || 0));
    };

    fetchUnread();
    fetchActivityCount();

    const channel = supabase
      .channel('navbar-unread')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { recipient_id: string; read_at: string | null };
          if (msg.recipient_id === profile.id && !msg.read_at) {
            setUnreadCount((c) => c + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { recipient_id: string; read_at: string | null };
          if (msg.recipient_id === profile.id && msg.read_at) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'likes' },
        (payload) => {
          const like = payload.new as { liked_id: string };
          if (like.liked_id === profile.id) {
            setActivityCount((c) => c + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profile_views' },
        (payload) => {
          const view = payload.new as { viewed_id: string };
          if (view.viewed_id === profile.id) {
            setActivityCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const navItems = [
    { id: 'browse', label: 'Browse', icon: Compass },
    { id: 'messages', label: 'Messages', icon: MessageCircle, badge: unreadCount },
    { id: 'activity', label: 'Activity', icon: Heart, badge: activityCount },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

  if (profile?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin', icon: Shield });
  }

  const handleNav = (page: string) => {
    onNavigate(page);
    setMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-cream-100/80 dark:bg-charcoal-900/80 backdrop-blur-lg border-b border-cream-200 dark:border-charcoal-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button onClick={() => handleNav('browse')} aria-label="Go to browse page">
          <Logo />
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            const badge = 'badge' in item ? (item as { badge: number }).badge : 0;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                aria-label={item.label}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  active
                    ? 'bg-terracotta-400/10 text-terracotta-500'
                    : 'text-charcoal-500 dark:text-cream-400 hover:bg-cream-200 dark:hover:bg-charcoal-700'
                }`}
              >
                <Icon size={18} />
                {item.label}
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-terracotta-400 text-white text-xs font-bold flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-cream-200 dark:hover:bg-charcoal-700 text-charcoal-500 dark:text-cream-400 transition-colors ml-2"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-charcoal-500 dark:text-cream-400 hover:bg-cream-200 dark:hover:bg-charcoal-700 transition-colors ml-2"
            aria-label="Sign out"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-cream-200 dark:hover:bg-charcoal-700 text-charcoal-500 dark:text-cream-400 transition-colors"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-2 rounded-lg hover:bg-cream-200 dark:hover:bg-charcoal-700 text-charcoal-500 dark:text-cream-400 transition-colors"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-cream-50 dark:bg-charcoal-800 border-t border-cream-200 dark:border-charcoal-700 animate-slide-up">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              const badge = 'badge' in item ? (item as { badge: number }).badge : 0;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                    active
                      ? 'bg-terracotta-400/10 text-terracotta-500'
                      : 'text-charcoal-500 dark:text-cream-400 hover:bg-cream-200 dark:hover:bg-charcoal-700'
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                  {badge > 0 && (
                    <span className="ml-auto w-5 h-5 rounded-full bg-terracotta-400 text-white text-xs font-bold flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              onClick={() => {
                signOut();
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-charcoal-500 dark:text-cream-400 hover:bg-cream-200 dark:hover:bg-charcoal-700 transition-all"
            >
              <LogOut size={20} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
