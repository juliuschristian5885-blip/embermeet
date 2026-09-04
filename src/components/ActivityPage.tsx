import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Profile, Photo, Like, ProfileView } from '@/lib/types';
import { formatLastActive } from '@/lib/utils';
import { VerificationBadge } from './VerificationBadge';
import {
  Heart,
  Eye,
  MessageCircle,
  Users,
  Loader2,
  Circle,
} from 'lucide-react';

interface ActivityPageProps {
  onOpenProfile: (profile: Profile) => void;
  onStartChat: (partnerId: string) => void;
}

type Tab = 'likes' | 'views';

export function ActivityPage({ onOpenProfile, onStartChat }: ActivityPageProps) {
  const { profile: myProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('likes');
  const [likes, setLikes] = useState<Like[]>([]);
  const [views, setViews] = useState<ProfileView[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [photosByUser, setPhotosByUser] = useState<Record<string, Photo[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    if (!myProfile) return;
    setLoading(true);

    const [likesRes, viewsRes] = await Promise.all([
      supabase
        .from('likes')
        .select('*')
        .eq('liked_id', myProfile.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('profile_views')
        .select('*')
        .eq('viewed_id', myProfile.id)
        .order('created_at', { ascending: false }),
    ]);

    const likeList = (likesRes.data || []) as Like[];
    const viewList = (viewsRes.data || []) as ProfileView[];

    const likeIds = likeList.map((l) => l.liker_id);
    const viewIds = viewList.map((v) => v.viewer_id);
    const allIds = Array.from(new Set([...likeIds, ...viewIds]));

    if (allIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', allIds);

      const profileMap: Record<string, Profile> = {};
      for (const p of (profileData || []) as Profile[]) {
        profileMap[p.id] = p;
      }
      setProfilesById(profileMap);

      const { data: photosData } = await supabase
        .from('photos')
        .select('*')
        .eq('status', 'approved')
        .in('user_id', allIds)
        .order('created_at', { ascending: true });

      const photoMap: Record<string, Photo[]> = {};
      for (const photo of (photosData || []) as Photo[]) {
        if (!photoMap[photo.user_id]) photoMap[photo.user_id] = [];
        photoMap[photo.user_id].push(photo);
      }
      setPhotosByUser(photoMap);
    }

    setLikes(likeList);
    setViews(viewList);
    setLoading(false);
  }, [myProfile]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const currentList = tab === 'likes' ? likes : views;
  const profileKey = tab === 'likes' ? 'liker_id' : 'viewer_id';

  return (
    <div className="pt-20 pb-12 px-4 sm:px-6 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-charcoal-700 dark:text-cream-100 mb-6">
          Activity
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('likes')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              tab === 'likes'
                ? 'bg-terracotta-400 text-white'
                : 'bg-white dark:bg-charcoal-800 text-charcoal-600 dark:text-cream-300 border border-cream-200 dark:border-charcoal-700 hover:border-terracotta-400'
            }`}
          >
            <Heart size={16} fill={tab === 'likes' ? 'currentColor' : 'none'} />
            Who Liked Me
            {likes.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                tab === 'likes' ? 'bg-white/20' : 'bg-terracotta-400/10 text-terracotta-500'
              }`}>
                {likes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('views')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              tab === 'views'
                ? 'bg-terracotta-400 text-white'
                : 'bg-white dark:bg-charcoal-800 text-charcoal-600 dark:text-cream-300 border border-cream-200 dark:border-charcoal-700 hover:border-terracotta-400'
            }`}
          >
            <Eye size={16} />
            Who Viewed Me
            {views.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                tab === 'views' ? 'bg-white/20' : 'bg-terracotta-400/10 text-terracotta-500'
              }`}>
                {views.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-terracotta-400" />
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-20">
            {tab === 'likes' ? (
              <>
                <Heart size={48} className="mx-auto text-charcoal-300 dark:text-charcoal-600 mb-4" />
                <p className="text-charcoal-500 dark:text-cream-400">
                  No one has liked your profile yet. Keep your profile updated to attract more connections!
                </p>
              </>
            ) : (
              <>
                <Eye size={48} className="mx-auto text-charcoal-300 dark:text-charcoal-600 mb-4" />
                <p className="text-charcoal-500 dark:text-cream-400">
                  No one has viewed your profile yet. Your profile will appear in browse results for others to discover.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentList.map((item) => {
              const personId = (item as unknown as Record<string, string>)[profileKey];
              const person = profilesById[personId];
              if (!person) return null;
              const photos = photosByUser[personId] || [];
              const primaryPhoto = photos[0];
              const timeAgo = formatLastActive(item.created_at);

              return (
                <div
                  key={item.id}
                  className="card p-4 flex items-center gap-4 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => onOpenProfile(person)}
                >
                  <div className="relative shrink-0">
                    {primaryPhoto ? (
                      <img
                        src={primaryPhoto.url}
                        alt={person.display_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-terracotta-400 to-ember-500 flex items-center justify-center text-white font-bold text-xl">
                        {person.display_name[0]?.toUpperCase()}
                      </div>
                    )}
                    {person.is_online && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 border-2 border-cream-50 dark:border-charcoal-800" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-charcoal-700 dark:text-cream-100 truncate">
                        {person.display_name}
                      </h3>
                      {person.is_verified && <VerificationBadge size={15} />}
                    </div>
                    <p className="text-sm text-charcoal-400 dark:text-cream-500 truncate">
                      {person.age} · {person.location || 'Unknown'}
                    </p>
                    <p className="text-xs text-charcoal-400 dark:text-cream-500 mt-0.5">
                      {tab === 'likes' ? 'Liked you' : 'Viewed your profile'} · {timeAgo}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartChat(person.id);
                      }}
                      className="p-2.5 rounded-xl bg-terracotta-400 text-white hover:bg-terracotta-500 transition-colors"
                      title="Send message"
                    >
                      <MessageCircle size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenProfile(person);
                      }}
                      className="p-2.5 rounded-xl bg-cream-200 dark:bg-charcoal-700 text-charcoal-600 dark:text-cream-300 hover:bg-cream-300 dark:hover:bg-charcoal-600 transition-colors"
                      title="View profile"
                    >
                      <Users size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
