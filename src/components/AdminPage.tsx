import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import type { Photo, Report, Profile } from '@/lib/types';
import {
  Shield,
  Image as ImageIcon,
  Flag,
  Users,
  RefreshCw,
  Check,
  X,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Trash2,
} from 'lucide-react';

type Tab = 'photos' | 'reports' | 'users' | 'stats' | 'deletions';

export function AdminPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('photos');
  const [pendingPhotos, setPendingPhotos] = useState<Photo[]>([]);
  const [pendingPhotoProfiles, setPendingPhotoProfiles] = useState<Record<string, Profile>>({});
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalPhotos: 0, pendingPhotos: 0, pendingReports: 0, onlineUsers: 0 });
  const [deletionRequests, setDeletionRequests] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    // All photos for moderation
    const { data: photos } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });
    const photoList = (photos || []) as Photo[];
    setPendingPhotos(photoList);

    if (photoList.length > 0) {
      const userIds = Array.from(new Set(photoList.map((p) => p.user_id)));
      const { data: photoProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      const map: Record<string, Profile> = {};
      for (const p of (photoProfiles || []) as Profile[]) {
        map[p.id] = p;
      }
      setPendingPhotoProfiles(map);
    }

    // Reports
    const { data: reportsData } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    const reportList = (reportsData || []) as Report[];

    if (reportList.length > 0) {
      const reporterIds = reportList.map((r) => r.reporter_id);
      const reportedIds = reportList.map((r) => r.reported_id);
      const allIds = Array.from(new Set([...reporterIds, ...reportedIds]));
      const { data: reportProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', allIds);
      const profileMap: Record<string, Profile> = {};
      for (const p of (reportProfiles || []) as Profile[]) {
        profileMap[p.id] = p;
      }
      const enriched = reportList.map((r) => ({
        ...r,
        reporter: profileMap[r.reporter_id],
        reported: profileMap[r.reported_id],
      }));
      setReports(enriched);
    } else {
      setReports([]);
    }

    // Users
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers((usersData || []) as Profile[]);

    // Stats
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    const { count: totalPhotos } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true });
    const { count: pendingPhotosCount } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    const { count: pendingReportsCount } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    const { count: onlineUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_online', true);

    setStats({
      totalUsers: totalUsers || 0,
      totalPhotos: totalPhotos || 0,
      pendingPhotos: pendingPhotosCount || 0,
      pendingReports: pendingReportsCount || 0,
      onlineUsers: onlineUsers || 0,
    });

    // Deletion requests
    const { data: deletionData } = await supabase
      .from('profiles')
      .select('*')
      .not('deletion_requested_at', 'is', null)
      .order('deletion_requested_at', { ascending: false });
    setDeletionRequests((deletionData || []) as Profile[]);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handlePhotoAction = async (photoId: string, status: 'approved' | 'rejected') => {
    setActionLoading(photoId);
    const { error } = await supabase
      .from('photos')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: profile?.id,
      })
      .eq('id', photoId);
    setActionLoading(null);
    if (error) {
      toast(`Failed to ${status === 'approved' ? 'approve' : 'reject'} photo`, 'error');
    } else {
      toast(`Photo ${status === 'approved' ? 'approved' : 'rejected'}`, 'success');
    }
    fetchAll();
  };

  const handleReportAction = async (reportId: string, status: 'resolved' | 'dismissed') => {
    setActionLoading(reportId);
    const { error } = await supabase
      .from('reports')
      .update({
        status,
        resolved_at: new Date().toISOString(),
        resolved_by: profile?.id,
      })
      .eq('id', reportId);
    setActionLoading(null);
    if (error) {
      toast(`Failed to ${status} report`, 'error');
    } else {
      toast(`Report ${status}`, 'success');
    }
    fetchAll();
  };

  const handleBanToggle = async (userId: string, isBanned: boolean) => {
    setActionLoading(userId);
    const { error } = await supabase.rpc('admin_toggle_ban', {
      target_user_id: userId,
      ban: !isBanned,
    });
    setActionLoading(null);
    if (error) {
      toast(`Failed to ${isBanned ? 'unban' : 'ban'} user`, 'error');
    } else {
      toast(`User ${isBanned ? 'unbanned' : 'banned'}`, 'success');
    }
    fetchAll();
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="pt-20 px-4 text-center min-h-screen flex items-center justify-center">
        <div>
          <Shield size={48} className="mx-auto text-charcoal-300 dark:text-charcoal-600 mb-4" />
          <p className="text-charcoal-500 dark:text-cream-400">
            You don't have access to the admin panel.
          </p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Shield; count?: number }[] = [
    { id: 'photos', label: 'Photos', icon: ImageIcon, count: stats.totalPhotos },
    { id: 'reports', label: 'Reports', icon: Flag, count: stats.pendingReports },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'stats', label: 'Statistics', icon: Shield },
    { id: 'deletions', label: 'Deletions', icon: Trash2, count: deletionRequests.length },
  ];

  return (
    <div className="pt-20 pb-12 px-4 sm:px-6 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-charcoal-700 dark:text-cream-100 flex items-center gap-2">
              <Shield size={28} className="text-terracotta-400" />
              Admin Panel
            </h1>
            <p className="text-sm text-charcoal-400 dark:text-cream-400 mt-1">
              Manage photos, reports, and users
            </p>
          </div>
          <button
            onClick={fetchAll}
            className="btn-secondary flex items-center gap-2 text-sm"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                  active
                    ? 'bg-terracotta-400 text-white shadow-lg shadow-terracotta-400/20'
                    : 'bg-white dark:bg-charcoal-800 text-charcoal-500 dark:text-cream-400 hover:bg-cream-100 dark:hover:bg-charcoal-700'
                }`}
              >
                <Icon size={18} />
                {tab.label}
                {tab.count != null && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                      active ? 'bg-white/20' : 'bg-terracotta-400/10 text-terracotta-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-4 flex gap-4 animate-pulse">
                <div className="w-32 h-32 rounded-xl bg-cream-200 dark:bg-charcoal-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-cream-200 dark:bg-charcoal-700 rounded w-1/3" />
                  <div className="h-3 bg-cream-200 dark:bg-charcoal-700 rounded w-1/4" />
                  <div className="h-3 bg-cream-200 dark:bg-charcoal-700 rounded w-1/5 mt-2" />
                  <div className="flex gap-2 mt-3">
                    <div className="h-8 w-20 bg-cream-200 dark:bg-charcoal-700 rounded-lg" />
                    <div className="h-8 w-20 bg-cream-200 dark:bg-charcoal-700 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Photos tab */}
            {activeTab === 'photos' && (
              <div className="space-y-4">
                {pendingPhotos.length === 0 ? (
                  <EmptyState icon={ImageIcon} message="No photos uploaded yet." />
                ) : (
                  pendingPhotos.map((photo) => {
                    const owner = pendingPhotoProfiles[photo.user_id];
                    return (
                      <div
                        key={photo.id}
                        className="card p-4 flex flex-col sm:flex-row gap-4 animate-slide-up"
                      >
                        <div className="w-full sm:w-32 h-32 rounded-xl overflow-hidden bg-cream-200 dark:bg-charcoal-700 shrink-0">
                          <img
                            src={photo.url}
                            alt="Pending"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-charcoal-700 dark:text-cream-100">
                                {owner?.display_name || 'Unknown user'}
                              </p>
                              <span
                                className={`badge text-xs ${
                                  photo.status === 'approved'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : photo.status === 'rejected'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-ember-100 text-ember-700 dark:bg-ember-900/30 dark:text-ember-400'
                                }`}
                              >
                                {photo.status}
                              </span>
                            </div>
                            <p className="text-sm text-charcoal-400 dark:text-cream-500">
                              {owner?.email}
                            </p>
                            <p className="text-xs text-charcoal-400 dark:text-cream-500 mt-1 flex items-center gap-1">
                              <Clock size={12} />
                              Uploaded {new Date(photo.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handlePhotoAction(photo.id, 'approved')}
                              disabled={actionLoading === photo.id || photo.status === 'approved'}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-all disabled:opacity-50"
                            >
                              {actionLoading === photo.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Check size={16} />
                              )}
                              {photo.status === 'approved' ? 'Approved' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handlePhotoAction(photo.id, 'rejected')}
                              disabled={actionLoading === photo.id || photo.status === 'rejected'}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-all disabled:opacity-50"
                            >
                              <X size={16} />
                              {photo.status === 'rejected' ? 'Rejected' : 'Reject'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Reports tab */}
            {activeTab === 'reports' && (
              <div className="space-y-4">
                {reports.length === 0 ? (
                  <EmptyState icon={Flag} message="No reports to review." />
                ) : (
                  reports.map((report) => (
                    <div key={report.id} className="card p-4 animate-slide-up">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                          <AlertTriangle size={20} className="text-red-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <p className="font-semibold text-charcoal-700 dark:text-cream-100">
                              Report on {report.reported?.display_name || 'Unknown'}
                            </p>
                            <span
                              className={`badge text-xs ${
                                report.status === 'pending'
                                  ? 'bg-ember-100 text-ember-700 dark:bg-ember-900/30 dark:text-ember-400'
                                  : report.status === 'resolved'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-cream-200 text-charcoal-500 dark:bg-charcoal-700 dark:text-cream-400'
                              }`}
                            >
                              {report.status}
                            </span>
                          </div>
                          <p className="text-sm text-charcoal-500 dark:text-cream-400 mt-1">
                            <strong>Reason:</strong>{' '}
                            {report.reason.replace(/_/g, ' ')}
                          </p>
                          {report.details && (
                            <p className="text-sm text-charcoal-500 dark:text-cream-400 mt-1">
                              <strong>Details:</strong> {report.details}
                            </p>
                          )}
                          <p className="text-xs text-charcoal-400 dark:text-cream-500 mt-2">
                            Reported by {report.reporter?.display_name || 'Unknown'} ·{' '}
                            {new Date(report.created_at).toLocaleString()}
                          </p>
                          {report.status === 'pending' && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleReportAction(report.id, 'resolved')}
                                disabled={actionLoading === report.id}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-all disabled:opacity-50"
                              >
                                {actionLoading === report.id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <CheckCircle2 size={16} />
                                )}
                                Resolve
                              </button>
                              <button
                                onClick={() => handleReportAction(report.id, 'dismissed')}
                                disabled={actionLoading === report.id}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cream-200 dark:bg-charcoal-700 hover:bg-cream-300 dark:hover:bg-charcoal-600 text-charcoal-600 dark:text-cream-300 text-sm font-medium transition-all disabled:opacity-50"
                              >
                                <X size={16} />
                                Dismiss
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Users tab */}
            {activeTab === 'users' && (
              <div className="space-y-3">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="card p-4 flex items-center justify-between gap-4 animate-slide-up"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-terracotta-400 to-ember-500 flex items-center justify-center text-white font-bold shrink-0">
                        {u.display_name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-charcoal-700 dark:text-cream-100 truncate">
                          {u.display_name}
                          {u.role === 'admin' && (
                            <span className="ml-2 badge badge-distance text-xs">Admin</span>
                          )}
                        </p>
                        <p className="text-sm text-charcoal-400 dark:text-cream-500 truncate">
                          {u.email} · {u.age} · {u.location || 'No location'}
                        </p>
                      </div>
                    </div>
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleBanToggle(u.id, u.is_banned)}
                        disabled={actionLoading === u.id}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                          u.is_banned
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                      >
                        {actionLoading === u.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : u.is_banned ? (
                          <>
                            <CheckCircle2 size={16} /> Unban
                          </>
                        ) : (
                          <>
                            <Ban size={16} /> Ban
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Deletion requests tab */}
            {activeTab === 'deletions' && (
              <div className="space-y-3">
                {deletionRequests.length === 0 ? (
                  <EmptyState icon={Trash2} message="No account deletion requests." />
                ) : (
                  deletionRequests.map((u) => (
                    <div
                      key={u.id}
                      className="card p-4 flex items-center justify-between gap-4 animate-slide-up"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold shrink-0">
                          {u.display_name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-charcoal-700 dark:text-cream-100 truncate">
                            {u.display_name}
                          </p>
                          <p className="text-sm text-charcoal-400 dark:text-cream-500 truncate">
                            {u.email}
                          </p>
                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <Clock size={12} />
                            Requested {new Date(u.deletion_requested_at!).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs shrink-0">
                        Pending
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Stats tab */}
            {activeTab === 'stats' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard label="Total Users" value={stats.totalUsers} icon={Users} />
                <StatCard label="Online Now" value={stats.onlineUsers} icon={Users} highlight />
                <StatCard label="Total Photos" value={stats.totalPhotos} icon={ImageIcon} />
                <StatCard
                  label="Pending Photos"
                  value={stats.pendingPhotos}
                  icon={ImageIcon}
                  highlight
                />
                <StatCard
                  label="Pending Reports"
                  value={stats.pendingReports}
                  icon={Flag}
                  highlight
                />
                <StatCard
                  label="Banned Users"
                  value={users.filter((u) => u.is_banned).length}
                  icon={Ban}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof Shield; message: string }) {
  return (
    <div className="text-center py-16">
      <Icon size={48} className="mx-auto text-charcoal-300 dark:text-charcoal-600 mb-4" />
      <p className="text-charcoal-500 dark:text-cream-400">{message}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: typeof Shield;
  highlight?: boolean;
}) {
  return (
    <div
      className={`card p-6 ${
        highlight && value > 0
          ? 'border-terracotta-400/30 bg-terracotta-400/5'
          : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-charcoal-400 dark:text-cream-500">{label}</span>
        <Icon size={20} className="text-terracotta-400" />
      </div>
      <p className="text-3xl font-bold text-charcoal-700 dark:text-cream-100">{value}</p>
    </div>
  );
}
