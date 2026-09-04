import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import type { Profile, Photo, BodyType, RelationshipStatus, SmokingHabit, DrinkingHabit } from '@/lib/types';
import { ICEBREAKER_MESSAGES } from '@/lib/types';
import {
  calculateDistance,
  formatDistance,
  formatLastActive,
  parseInterests,
} from '@/lib/utils';
import { VerificationBadge } from './VerificationBadge';
import {
  MapPin,
  Circle,
  Calendar,
  Tag,
  Upload,
  Trash2,
  Edit3,
  MessageCircle,
  Flag,
  Ban,
  ArrowLeft,
  X,
  Clock,
  Image as ImageIcon,
  AlertCircle,
  Check,
  Loader2,
  AlertTriangle,
  Heart,
  Sparkles,
  Mail,
  Ruler,
  User as UserIcon,
  Cigarette,
  Wine,
} from 'lucide-react';

interface ProfilePageProps {
  profile: Profile | null;
  isOwn: boolean;
  onBack: () => void;
  onStartChat: (partnerId: string) => void;
  onReport: (profile: Profile) => void;
}

export function ProfilePage({
  profile,
  isOwn,
  onBack,
  onStartChat,
  onReport,
}: ProfilePageProps) {
  const { profile: myProfile, refreshProfile, isEmailVerified, resendVerification } = useAuth();
  const { toast } = useToast();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [showIcebreakers, setShowIcebreakers] = useState(false);

  const fetchPhotos = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setPhotos(data as Photo[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (profile && myProfile && profile.id !== myProfile.id) {
      supabase
        .from('blocked_users')
        .select('id')
        .eq('blocked_id', profile.id)
        .maybeSingle()
        .then(({ data }) => setIsBlocked(!!data));

      supabase
        .from('likes')
        .select('id')
        .eq('liker_id', myProfile.id)
        .eq('liked_id', profile.id)
        .maybeSingle()
        .then(({ data }) => setIsLiked(!!data));

      // Record profile view (upsert to handle unique constraint)
      supabase
        .from('profile_views')
        .upsert({
          viewer_id: myProfile.id,
          viewed_id: profile.id,
          created_at: new Date().toISOString(),
        }, { onConflict: 'viewer_id,viewed_id' })
        .then();
    }
  }, [profile, myProfile]);

  useEffect(() => {
    if (profile) {
      fetchPhotos(profile.id);
    }
  }, [profile, fetchPhotos]);

  const handleBlockToggle = async () => {
    if (!profile) return;
    setBlockLoading(true);
    if (isBlocked) {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocked_id', profile.id);
      if (error) {
        toast('Failed to unblock user', 'error');
      } else {
        setIsBlocked(false);
        toast(`${profile.display_name} has been unblocked`, 'success');
      }
    } else {
      const { error } = await supabase
        .from('blocked_users')
        .insert({ blocked_id: profile.id });
      if (error) {
        toast('Failed to block user', 'error');
      } else {
        setIsBlocked(true);
        toast(`${profile.display_name} has been blocked`, 'success');
      }
    }
    setBlockLoading(false);
  };

  const handleLikeToggle = async () => {
    if (!profile || !myProfile) return;
    setLikeLoading(true);
    if (isLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('liker_id', myProfile.id)
        .eq('liked_id', profile.id);
      if (error) {
        toast('Failed to unlike', 'error');
      } else {
        setIsLiked(false);
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ liker_id: myProfile.id, liked_id: profile.id });
      if (error) {
        toast('Failed to like', 'error');
      } else {
        setIsLiked(true);
        toast(`You liked ${profile.display_name}`, 'success');
      }
    }
    setLikeLoading(false);
  };

  const handleResendVerification = async () => {
    const { error } = await resendVerification();
    if (error) {
      toast('Failed to send verification email', 'error');
    } else {
      toast('Verification email sent. Check your inbox.', 'success');
    }
  };

  if (!profile) {
    return (
      <div className="pt-20 px-4 text-center">
        <p className="text-charcoal-500 dark:text-cream-400">Profile not found.</p>
        <button onClick={onBack} className="btn-secondary mt-4">
          Go back
        </button>
      </div>
    );
  }

  const distance = myProfile
    ? calculateDistance(myProfile.latitude, myProfile.longitude, profile.latitude, profile.longitude)
    : null;

  const approvedPhotos = photos.filter((p) => p.status === 'approved');
  const primaryPhoto = approvedPhotos[0] || photos[0];

  // Profile completion calculation
  const completionFields = [
    { key: 'photo', filled: approvedPhotos.length > 0, label: 'Add a photo' },
    { key: 'bio', filled: profile.bio.trim().length > 0, label: 'Write a bio' },
    { key: 'location', filled: profile.location.trim().length > 0, label: 'Set your location' },
    { key: 'interests', filled: profile.interests.length > 0, label: 'Add interests' },
    { key: 'gender', filled: !!profile.gender, label: 'Set your gender' },
    { key: 'height', filled: profile.height != null, label: 'Add your height' },
    { key: 'body_type', filled: !!profile.body_type, label: 'Add body type' },
    { key: 'relationship', filled: !!profile.relationship_status, label: 'Add relationship status' },
  ];
  const completedCount = completionFields.filter((f) => f.filled).length;
  const completionPct = Math.round((completedCount / completionFields.length) * 100);
  const missingFields = completionFields.filter((f) => !f.filled);

  if (editing && isOwn) {
    return (
      <EditProfileForm
        profile={profile}
        photos={photos}
        onPhotosChanged={() => fetchPhotos(profile.id)}
        onSave={async () => {
          await refreshProfile();
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="pt-20 pb-12 px-4 sm:px-6 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-charcoal-500 dark:text-cream-400 hover:text-terracotta-400 transition-colors mb-4"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {/* Profile Completion Meter */}
        {isOwn && completionPct < 100 && (
          <div className="card p-5 mb-4 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-terracotta-400" />
                <h3 className="text-sm font-semibold text-charcoal-700 dark:text-cream-100">
                  Profile completion
                </h3>
              </div>
              <span className="text-lg font-bold text-terracotta-500">{completionPct}%</span>
            </div>
            <div className="w-full h-3 bg-cream-200 dark:bg-charcoal-700 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-terracotta-400 to-gold-500 rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            {missingFields.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {missingFields.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-cream-100 dark:bg-charcoal-700 text-charcoal-500 dark:text-cream-400 hover:bg-terracotta-400/10 hover:text-terracotta-500 transition-colors"
                  >
                    <AlertCircle size={12} />
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Email verification prompt */}
        {isOwn && !isEmailVerified && (
          <div className="card p-4 mb-4 flex items-center gap-3 border-gold-400/30 bg-gold-400/5 animate-slide-up">
            <Mail size={20} className="text-gold-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-charcoal-700 dark:text-cream-100">
                Verify your email to get a verified badge
              </p>
              <p className="text-xs text-charcoal-500 dark:text-cream-400 mt-0.5">
                Verified profiles get more connections.
              </p>
            </div>
            <button
              onClick={handleResendVerification}
              className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
            >
              <Mail size={16} />
              Resend
            </button>
          </div>
        )}

        <div className="card overflow-hidden">
          {/* Cover photo */}
          <div className="relative h-64 sm:h-80 bg-cream-200 dark:bg-charcoal-700 overflow-hidden">
            {primaryPhoto ? (
              <img
                src={primaryPhoto.url}
                alt={profile.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-cream-400 dark:text-charcoal-500">
                <ImageIcon size={64} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 to-transparent" />
          </div>

          {/* Profile header */}
          <div className="px-6 sm:px-8 -mt-12 relative">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold text-charcoal-700 dark:text-cream-100">
                    {profile.display_name}
                  </h1>
                  {profile.is_verified && <VerificationBadge size={22} />}
                  {profile.is_online && (
                    <span className="badge badge-online">
                      <Circle size={8} fill="currentColor" className="text-green-500" />
                      Online
                    </span>
                  )}
                </div>
                <p className="text-charcoal-500 dark:text-cream-400 mt-1">
                  {profile.age} years · {profile.gender || 'Not specified'} ·{' '}
                  {profile.location || 'Location unknown'}
                </p>
                {distance != null && (
                  <p className="text-sm text-ember-600 dark:text-ember-400 mt-1 flex items-center gap-1">
                    <MapPin size={14} />
                    {formatDistance(distance)}
                  </p>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                {isOwn ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <Edit3 size={18} />
                    Edit profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onStartChat(profile.id)}
                      className="btn-primary flex items-center gap-2 text-sm"
                    >
                      <MessageCircle size={18} />
                      Message
                    </button>
                    <button
                      onClick={handleLikeToggle}
                      disabled={likeLoading}
                      className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 ${
                        isLiked
                          ? 'bg-terracotta-400 text-white'
                          : 'bg-cream-200 dark:bg-charcoal-700 text-charcoal-700 dark:text-cream-100 hover:bg-terracotta-400/10'
                      }`}
                    >
                      {likeLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
                      )}
                      {isLiked ? 'Liked' : 'Like'}
                    </button>
                    <button
                      onClick={() => onReport(profile)}
                      className="btn-secondary flex items-center gap-2 text-sm"
                    >
                      <Flag size={18} />
                      Report
                    </button>
                    <button
                      onClick={handleBlockToggle}
                      disabled={blockLoading}
                      className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 ${
                        isBlocked
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                          : 'bg-cream-200 dark:bg-charcoal-700 text-charcoal-700 dark:text-cream-100 hover:bg-cream-300 dark:hover:bg-charcoal-600'
                      }`}
                    >
                      {blockLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Ban size={18} />
                      )}
                      {isBlocked ? 'Unblock' : 'Block'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {!profile.is_online && (
              <p className="text-xs text-charcoal-400 dark:text-cream-500 mt-2 flex items-center gap-1">
                <Clock size={12} />
                Last active {formatLastActive(profile.last_active)}
              </p>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="px-6 sm:px-8 py-6">
              <h3 className="text-sm font-semibold text-charcoal-400 dark:text-cream-500 uppercase tracking-wide mb-2">
                About
              </h3>
              <p className="text-charcoal-600 dark:text-cream-300 leading-relaxed whitespace-pre-wrap">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Interests */}
          {profile.interests.length > 0 && (
            <div className="px-6 sm:px-8 py-6 border-t border-cream-200 dark:border-charcoal-700">
              <h3 className="text-sm font-semibold text-charcoal-400 dark:text-cream-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Tag size={14} />
                Interests
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <span key={interest} className="tag text-sm px-3 py-1.5">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Details */}
          {(profile.height || profile.body_type || profile.relationship_status || profile.smoking || profile.drinking) && (
            <div className="px-6 sm:px-8 py-6 border-t border-cream-200 dark:border-charcoal-700">
              <h3 className="text-sm font-semibold text-charcoal-400 dark:text-cream-500 uppercase tracking-wide mb-3">
                Details
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {profile.height != null && (
                  <div className="flex items-center gap-2 text-sm text-charcoal-600 dark:text-cream-300">
                    <Ruler size={16} className="text-terracotta-400" />
                    {profile.height} cm
                  </div>
                )}
                {profile.body_type && (
                  <div className="flex items-center gap-2 text-sm text-charcoal-600 dark:text-cream-300">
                    <UserIcon size={16} className="text-terracotta-400" />
                    {profile.body_type}
                  </div>
                )}
                {profile.relationship_status && (
                  <div className="flex items-center gap-2 text-sm text-charcoal-600 dark:text-cream-300">
                    <Heart size={16} className="text-terracotta-400" />
                    {profile.relationship_status}
                  </div>
                )}
                {profile.smoking && (
                  <div className="flex items-center gap-2 text-sm text-charcoal-600 dark:text-cream-300">
                    <Cigarette size={16} className="text-terracotta-400" />
                    {profile.smoking}
                  </div>
                )}
                {profile.drinking && (
                  <div className="flex items-center gap-2 text-sm text-charcoal-600 dark:text-cream-300">
                    <Wine size={16} className="text-terracotta-400" />
                    {profile.drinking}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Photo gallery */}
          <div className="px-6 sm:px-8 py-6 border-t border-cream-200 dark:border-charcoal-700">
            <h3 className="text-sm font-semibold text-charcoal-400 dark:text-cream-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <ImageIcon size={14} />
              Photos ({photos.length}/5)
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-terracotta-400" />
              </div>
            ) : photos.length === 0 ? (
              <p className="text-sm text-charcoal-400 dark:text-cream-500">
                {isOwn ? 'No photos yet. Edit your profile to add some.' : 'No photos yet.'}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-xl overflow-hidden bg-cream-200 dark:bg-charcoal-700 group"
                  >
                    <img
                      src={photo.url}
                      alt="Profile photo"
                      className="w-full h-full object-cover"
                    />
                    {photo.status !== 'approved' && (
                      <div className="absolute inset-0 bg-charcoal-900/60 flex items-center justify-center">
                        <span
                          className={`badge text-xs ${
                            photo.status === 'pending'
                              ? 'bg-ember-100 text-ember-700 dark:bg-ember-900/40 dark:text-ember-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                          }`}
                        >
                          {photo.status === 'pending' ? (
                            <>
                              <Clock size={12} /> Pending review
                            </>
                          ) : (
                            <>
                              <AlertCircle size={12} /> Rejected
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="px-6 sm:px-8 py-4 border-t border-cream-200 dark:border-charcoal-700 flex items-center gap-2 text-xs text-charcoal-400 dark:text-cream-500">
            <Calendar size={12} />
            Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EDIT PROFILE FORM
// ============================================================

function EditProfileForm({
  profile,
  photos,
  onPhotosChanged,
  onSave,
  onCancel,
}: {
  profile: Profile;
  photos: Photo[];
  onPhotosChanged: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio);
  const [age, setAge] = useState(profile.age);
  const [gender, setGender] = useState(profile.gender || '');
  const [location, setLocation] = useState(profile.location);
  const [interests, setInterests] = useState(profile.interests.join(', '));
  const [height, setHeight] = useState(profile.height ?? '');
  const [bodyType, setBodyType] = useState<BodyType>(profile.body_type || '');
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus>(profile.relationship_status || '');
  const [smoking, setSmoking] = useState<SmokingHabit>(profile.smoking || '');
  const [drinking, setDrinking] = useState<DrinkingHabit>(profile.drinking || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 5) {
      setError('You can have a maximum of 5 photos.');
      return;
    }

    setUploading(true);
    setError(null);

    let successCount = 0;
    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          setError(`"${file.name}" exceeds 5MB limit.`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${profile.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, file);

        if (uploadError) {
          setError(uploadError.message);
          continue;
        }

        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filePath);

        const { error: photoError } = await supabase.from('photos').insert({
          user_id: profile.id,
          storage_path: filePath,
          url: urlData.publicUrl,
          status: 'approved',
        });

        if (photoError) {
          setError(photoError.message);
          continue;
        }

        successCount++;
      }

      onPhotosChanged();
      if (successCount > 0) {
        setError(null);
        toast(`${successCount} photo${successCount > 1 ? 's' : ''} uploaded successfully`, 'success');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed unexpectedly.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (photoId: string, storagePath: string) => {
    await supabase.storage.from('photos').remove([storagePath]);
    await supabase.from('photos').delete().eq('id', photoId);
    onPhotosChanged();
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        bio,
        age: Math.max(18, age),
        gender: gender || null,
        location,
        interests: parseInterests(interests),
        height: height === '' ? null : Number(height),
        body_type: bodyType || null,
        relationship_status: relationshipStatus || null,
        smoking: smoking || null,
        drinking: drinking || null,
      })
      .eq('id', profile.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      toast('Failed to save profile', 'error');
    } else {
      toast('Profile saved successfully', 'success');
      onSave();
    }
  };

  return (
    <div className="pt-20 pb-12 px-4 sm:px-6 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-charcoal-700 dark:text-cream-100">Edit profile</h1>
          <button onClick={onCancel} className="btn-ghost flex items-center gap-2 text-sm">
            <X size={18} /> Cancel
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="card p-6 space-y-5">
          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-3">
              Photos ({photos.length}/5)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square rounded-xl overflow-hidden bg-cream-200 dark:bg-charcoal-700 group"
                >
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  {photo.status !== 'approved' && (
                    <div className="absolute inset-0 bg-charcoal-900/50 flex items-center justify-center">
                      <span
                        className={`badge text-xs ${
                          photo.status === 'pending'
                            ? 'bg-ember-100 text-ember-700 dark:bg-ember-900/40 dark:text-ember-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                        }`}
                      >
                        {photo.status}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => handleDeletePhoto(photo.id, photo.storage_path)}
                    className="absolute top-1 right-1 p-1 rounded-lg bg-red-500/80 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-cream-300 dark:border-charcoal-600 flex flex-col items-center justify-center cursor-pointer hover:border-terracotta-400 hover:bg-terracotta-400/5 transition-all">
                  {uploading ? (
                    <Loader2 size={24} className="animate-spin text-terracotta-400" />
                  ) : (
                    <>
                      <Upload size={20} className="text-charcoal-400 dark:text-cream-500 mb-1" />
                      <span className="text-xs text-charcoal-400 dark:text-cream-500">Upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-charcoal-400 dark:text-cream-500 mt-2">
              Max 5 photos, 5MB each.
            </p>
            <div className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-gold-100/50 dark:bg-gold-900/20 border border-gold-300/40 dark:border-gold-700/30">
              <AlertTriangle size={16} className="text-gold-600 dark:text-gold-400 shrink-0 mt-0.5" />
              <p className="text-xs text-gold-700 dark:text-gold-300">
                Photos are subject to review. Inappropriate content will be removed and may result in a ban.
              </p>
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-1.5">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input-field"
              placeholder="Your display name"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-1.5">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="input-field resize-none"
              placeholder="Tell people about yourself..."
            />
          </div>

          {/* Age + Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-1.5">
                Age (18+)
              </label>
              <input
                type="number"
                min={18}
                max={120}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-1.5">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="input-field"
              >
                <option value="">Not specified</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-1.5">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input-field"
              placeholder="City, State"
            />
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-1.5">
              Interests (comma-separated)
            </label>
            <input
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              className="input-field"
              placeholder="hiking, photography, coffee..."
            />
          </div>

          {/* Height */}
          <div>
            <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-1.5">
              Height (cm)
            </label>
            <input
              type="number"
              min={100}
              max={250}
              value={height}
              onChange={(e) => setHeight(e.target.value === '' ? '' : Number(e.target.value))}
              className="input-field"
              placeholder="e.g. 175"
            />
          </div>

          {/* Body type + Relationship status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-1.5">
                Body type
              </label>
              <select
                value={bodyType}
                onChange={(e) => setBodyType(e.target.value as BodyType)}
                className="input-field"
              >
                <option value="">Not specified</option>
                <option value="slim">Slim</option>
                <option value="athletic">Athletic</option>
                <option value="average">Average</option>
                <option value="curvy">Curvy</option>
                <option value="muscular">Muscular</option>
                <option value="plus-size">Plus-size</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-1.5">
                Relationship status
              </label>
              <select
                value={relationshipStatus}
                onChange={(e) => setRelationshipStatus(e.target.value as RelationshipStatus)}
                className="input-field"
              >
                <option value="">Not specified</option>
                <option value="single">Single</option>
                <option value="divorced">Divorced</option>
                <option value="separated">Separated</option>
                <option value="widowed">Widowed</option>
                <option value="in a relationship">In a relationship</option>
              </select>
            </div>
          </div>

          {/* Smoking + Drinking */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-1.5">
                Smoking
              </label>
              <select
                value={smoking}
                onChange={(e) => setSmoking(e.target.value as SmokingHabit)}
                className="input-field"
              >
                <option value="">Not specified</option>
                <option value="never">Never</option>
                <option value="socially">Socially</option>
                <option value="regularly">Regularly</option>
                <option value="trying to quit">Trying to quit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-1.5">
                Drinking
              </label>
              <select
                value={drinking}
                onChange={(e) => setDrinking(e.target.value as DrinkingHabit)}
                className="input-field"
              >
                <option value="">Not specified</option>
                <option value="never">Never</option>
                <option value="socially">Socially</option>
                <option value="regularly">Regularly</option>
                <option value="trying to quit">Trying to quit</option>
              </select>
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Check size={20} /> Save changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
