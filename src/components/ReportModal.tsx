import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { Modal } from './Modal';
import { Flag, AlertCircle, Loader2, Check } from 'lucide-react';

interface ReportModalProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: 'inappropriate_behavior', label: 'Inappropriate behavior' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'fake_profile', label: 'Fake profile' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'underage', label: 'Underage user' },
  { value: 'other', label: 'Other' },
];

export function ReportModal({ profile, isOpen, onClose }: ReportModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!profile || !user) return;
    if (!reason) {
      setError('Please select a reason.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: reportError } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_id: profile.id,
      reason,
      details,
      status: 'pending',
    });

    setSubmitting(false);

    if (reportError) {
      setError(reportError.message);
    } else {
      setSuccess(true);
      toast('Report submitted successfully', 'success');
      setTimeout(() => {
        handleClose();
      }, 1500);
    }
  };

  const handleClose = () => {
    setReason('');
    setDetails('');
    setSuccess(false);
    setError(null);
    onClose();
  };

  if (!profile) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Report user" maxWidth="max-w-lg">
      {success ? (
        <div className="text-center py-8 animate-scale-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <Check size={32} className="text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-bold text-charcoal-700 dark:text-cream-100 mb-1">
            Report submitted
          </h3>
          <p className="text-sm text-charcoal-500 dark:text-cream-400">
            Thank you. Our admin team will review this report promptly.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-cream-100 dark:bg-charcoal-700/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-terracotta-400 to-ember-500 flex items-center justify-center text-white font-bold">
              {profile.display_name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-charcoal-700 dark:text-cream-100">
                {profile.display_name}
              </p>
              <p className="text-xs text-charcoal-400 dark:text-cream-500">
                You are reporting this user
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-2">
              Reason
            </label>
            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    reason === r.value
                      ? 'border-terracotta-400 bg-terracotta-400/5'
                      : 'border-cream-200 dark:border-charcoal-600 hover:border-terracotta-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="accent-terracotta-400"
                  />
                  <span className="text-sm text-charcoal-600 dark:text-cream-300">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-1.5">
              Additional details (optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="input-field resize-none"
              placeholder="Provide more context about the issue..."
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Flag size={18} /> Submit report
              </>
            )}
          </button>
        </div>
      )}
    </Modal>
  );
}
