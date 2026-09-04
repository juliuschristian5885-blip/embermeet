import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import type { Profile, Report } from '@/lib/types';
import { Modal } from './Modal';
import {
  Settings,
  Shield,
  ShieldCheck,
  Ban,
  Flag,
  Trash2,
  Loader2,
  AlertTriangle,
  Check,
  Clock,
  ArrowLeft,
  Lock,
  Unlock,
  UserX,
  FileText,
} from 'lucide-react';

interface SettingsPageProps {
  onBack: () => void;
  onOpenProfile: (profile: Profile) => void;
}

export function SettingsPage({ onBack, onOpenProfile }: SettingsPageProps) {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();

  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(true);
  const [unblockLoading, setUnblockLoading] = useState<string | null>(null);

  const [reports, setReports] = useState<ReportWithProfile[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      setTwoFAEnabled(profile.twofa_enabled ?? false);
    }
  }, [profile]);

  // --- 2FA Toggle ---
  const handleToggle2FA = async () => {
    if (!profile) return;
    setTwoFALoading(true);
    const newValue = !twoFAEnabled;
    const { error } = await supabase
      .from('profiles')
      .update({ twofa_enabled: newValue })
      .eq('id', profile.id);
    setTwoFALoading(false);
    if (error) {
      toast('Failed to update 2FA setting', 'error');
    } else {
      setTwoFAEnabled(newValue);
      toast(newValue ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled', 'success');
    }
  };

  // --- Blocked Users ---
  const fetchBlockedUsers = useCallback(async () => {
    if (!profile) return;
    setBlockedLoading(true);
    const { data, error } = await supabase
      .from('blocked_users')
      .select('id, blocked_id, created_at')
      .eq('blocker_id', profile.id)
      .order('created_at', { ascending: false });

    if (error || !data) {
      setBlockedLoading(false);
      return;
    }

    const blockedIds = data.map((b) => b.blocked_id);
    if (blockedIds.length === 0) {
      setBlockedUsers([]);
      setBlockedLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', blockedIds);

    const profileMap: Record<string, Profile> = {};
    for (const p of (profiles || []) as Profile[]) {
      profileMap[p.id] = p;
    }

    setBlockedUsers(
      data.map((b) => ({
        blockId: b.id,
        blockedAt: b.created_at,
        profile: profileMap[b.blocked_id],
      }))
    );
    setBlockedLoading(false);
  }, [profile]);

  const handleUnblock = async (blockId: string, displayName: string) => {
    setUnblockLoading(blockId);
    const { error } = await supabase.from('blocked_users').delete().eq('id', blockId);
    setUnblockLoading(null);
    if (error) {
      toast('Failed to unblock user', 'error');
    } else {
      toast(`${displayName} has been unblocked`, 'success');
      fetchBlockedUsers();
    }
  };

  // --- Report History ---
  const fetchReports = useCallback(async () => {
    if (!profile) return;
    setReportsLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('reporter_id', profile.id)
      .order('created_at', { ascending: false });

    if (error || !data) {
      setReportsLoading(false);
      return;
    }

    const reportList = data as Report[];
    if (reportList.length === 0) {
      setReports([]);
      setReportsLoading(false);
      return;
    }

    const reportedIds = Array.from(new Set(reportList.map((r) => r.reported_id)));
    const { data: reportedProfiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', reportedIds);

    const profileMap: Record<string, Profile> = {};
    for (const p of (reportedProfiles || []) as Profile[]) {
      profileMap[p.id] = p;
    }

    setReports(
      reportList.map((r) => ({
        ...r,
        reported: profileMap[r.reported_id],
      }))
    );
    setReportsLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchBlockedUsers();
    fetchReports();
  }, [fetchBlockedUsers, fetchReports]);

  // --- Account Deletion ---
  const handleDeleteAccount = async () => {
    if (!profile) return;
    setDeleting(true);
    const { error } = await supabase
      .from('profiles')
      .update({ deletion_requested_at: new Date().toISOString() })
      .eq('id', profile.id);
    setDeleting(false);
    if (error) {
      toast('Failed to submit deletion request', 'error');
    } else {
      toast('Account deletion request submitted', 'success');
      setShowDeleteModal(false);
      setDeleteConfirmText('');
      await signOut();
    }
  };

  if (!profile) return null;

  return (
    <div className="pt-20 pb-12 px-4 sm:px-6 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-charcoal-500 dark:text-cream-400 hover:text-terracotta-400 transition-colors mb-4"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="flex items-center gap-2 mb-6">
          <Settings size={28} className="text-terracotta-400" />
          <h1 className="text-2xl font-bold text-charcoal-700 dark:text-cream-100">Settings</h1>
        </div>

        {/* Two-Factor Authentication */}
        <Section
          icon={Shield}
          title="Two-Factor Authentication"
          description="Add an extra layer of security to your account."
        >
          <div className="flex items-center justify-between p-4 rounded-xl bg-cream-50 dark:bg-charcoal-700/50 border border-cream-200 dark:border-charcoal-700">
            <div className="flex items-center gap-3">
              {twoFAEnabled ? (
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Lock size={20} className="text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-cream-200 dark:bg-charcoal-600 flex items-center justify-center">
                  <Unlock size={20} className="text-charcoal-400 dark:text-cream-500" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-charcoal-700 dark:text-cream-100">
                  {twoFAEnabled ? '2FA is enabled' : '2FA is disabled'}
                </p>
                <p className="text-xs text-charcoal-400 dark:text-cream-500 mt-0.5">
                  {twoFAEnabled
                    ? 'Your account has extra protection.'
                    : 'Enable 2FA for additional sign-in security.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggle2FA}
              disabled={twoFALoading}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
                twoFAEnabled ? 'bg-green-500' : 'bg-cream-300 dark:bg-charcoal-600'
              }`}
              aria-label={twoFAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            >
              {twoFALoading ? (
                <Loader2 size={16} className="absolute left-1/2 -translate-x-1/2 text-white animate-spin" />
              ) : (
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    twoFAEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              )}
            </button>
          </div>
        </Section>

        {/* Blocked Users */}
        <Section
          icon={Ban}
          title="Blocked Users"
          description="People you've blocked can't message you or see your profile."
        >
          {blockedLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={24} className="animate-spin text-terracotta-400" />
            </div>
          ) : blockedUsers.length === 0 ? (
            <EmptyState icon={UserX} message="You haven't blocked anyone." />
          ) : (
            <div className="space-y-2">
              {blockedUsers.map((b) => (
                <div
                  key={b.blockId}
                  className="flex items-center gap-3 p-3 rounded-xl bg-cream-50 dark:bg-charcoal-700/50 border border-cream-200 dark:border-charcoal-700"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-terracotta-400 to-ember-500 flex items-center justify-center text-white font-bold shrink-0">
                    {b.profile?.display_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => b.profile && onOpenProfile(b.profile)}
                      className="font-semibold text-charcoal-700 dark:text-cream-100 hover:text-terracotta-400 transition-colors truncate block text-left"
                    >
                      {b.profile?.display_name ?? 'Unknown user'}
                    </button>
                    <p className="text-xs text-charcoal-400 dark:text-cream-500">
                      Blocked {new Date(b.blockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnblock(b.blockId, b.profile?.display_name ?? 'User')}
                    disabled={unblockLoading === b.blockId}
                    className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 shrink-0"
                  >
                    {unblockLoading === b.blockId ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Unlock size={14} />
                    )}
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Report History */}
        <Section
          icon={Flag}
          title="Report History"
          description="Track the status of reports you've submitted."
        >
          {reportsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={24} className="animate-spin text-terracotta-400" />
            </div>
          ) : reports.length === 0 ? (
            <EmptyState icon={FileText} message="You haven't submitted any reports." />
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="p-3 rounded-xl bg-cream-50 dark:bg-charcoal-700/50 border border-cream-200 dark:border-charcoal-700"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <button
                      onClick={() => r.reported && onOpenProfile(r.reported)}
                      className="font-semibold text-charcoal-700 dark:text-cream-100 hover:text-terracotta-400 transition-colors"
                    >
                      {r.reported?.display_name ?? 'Unknown user'}
                    </button>
                    <ReportStatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-charcoal-500 dark:text-cream-400 capitalize">
                    {r.reason.replace(/_/g, ' ')}
                  </p>
                  {r.details && (
                    <p className="text-xs text-charcoal-400 dark:text-cream-500 mt-1 line-clamp-2">
                      {r.details}
                    </p>
                  )}
                  <p className="text-xs text-charcoal-400 dark:text-cream-500 mt-1.5">
                    Submitted {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Account Deletion */}
        <Section
          icon={Trash2}
          title="Delete Account"
          description="Request permanent deletion of your account and all associated data."
          danger
        >
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40">
            <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-charcoal-600 dark:text-cream-300 mb-3">
                This will submit a deletion request. Your account and all data (profile, photos, messages) will be permanently removed once processed. This action cannot be undone.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={!!profile.deletion_requested_at}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
                {profile.deletion_requested_at ? 'Deletion Requested' : 'Delete My Account'}
              </button>
              {profile.deletion_requested_at && (
                <p className="text-xs text-red-500 mt-2">
                  Request submitted on {new Date(profile.deletion_requested_at).toLocaleDateString()}. Our team will process it shortly.
                </p>
              )}
            </div>
          </div>
        </Section>
      </div>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmText('');
        }}
        title="Delete Account"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
            <AlertTriangle size={24} className="text-red-500 shrink-0" />
            <p className="text-sm text-charcoal-600 dark:text-cream-300">
              This will permanently delete your profile, photos, messages, and all other data. This cannot be undone.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-1.5">
              Type <span className="font-bold text-red-500">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="input-field"
              placeholder="DELETE"
              autoFocus
            />
          </div>
          <button
            onClick={handleDeleteAccount}
            disabled={deleteConfirmText !== 'DELETE' || deleting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Trash2 size={18} />
                Delete My Account
              </>
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function Section({
  icon: Icon,
  title,
  description,
  children,
  danger,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="card p-5 sm:p-6 mb-4 animate-slide-up">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={20} className={danger ? 'text-red-500' : 'text-terracotta-400'} />
        <h2 className="text-lg font-bold text-charcoal-700 dark:text-cream-100">{title}</h2>
      </div>
      <p className="text-sm text-charcoal-400 dark:text-cream-500 mb-4">{description}</p>
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof Shield; message: string }) {
  return (
    <div className="text-center py-8">
      <Icon size={32} className="mx-auto text-charcoal-300 dark:text-charcoal-600 mb-2" />
      <p className="text-sm text-charcoal-400 dark:text-cream-500">{message}</p>
    </div>
  );
}

function ReportStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: typeof Clock; label: string }> = {
    pending: { bg: 'bg-gold-100 dark:bg-gold-900/30', text: 'text-gold-700 dark:text-gold-400', icon: Clock, label: 'Pending' },
    resolved: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: Check, label: 'Resolved' },
    dismissed: { bg: 'bg-cream-200 dark:bg-charcoal-600', text: 'text-charcoal-500 dark:text-cream-400', icon: AlertTriangle, label: 'Dismissed' },
  };
  const c = config[status] ?? config.pending;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <Icon size={12} />
      {c.label}
    </span>
  );
}

// ============================================================
// Types
// ============================================================

interface BlockedUser {
  blockId: string;
  blockedAt: string;
  profile?: Profile;
}

interface ReportWithProfile extends Report {
  reported?: Profile;
}
