import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import type { Profile, Photo, BodyType, RelationshipStatus, SmokingHabit, DrinkingHabit } from '@/lib/types';
import {
  calculateDistance,
  formatDistance,
  formatLastActive,
} from '@/lib/utils';
import { VerificationBadge } from './VerificationBadge';
import {
  MapPin,
  Filter,
  Users,
  Circle,
  Search,
  Compass,
  Flag,
  Ban,
  Heart,
  Ruler,
  Cigarette,
  Wine,
  X,
} from 'lucide-react';

interface BrowsePageProps {
  onOpenProfile: (profile: Profile) => void;
  onReport: (profile: Profile) => void;
}

type GenderFilter = 'all' | 'male' | 'female' | 'other';
type SortBy = 'distance' | 'online' | 'newest';
type DistanceFilter = 'any' | '5' | '10' | '25' | '50' | '100';

export function BrowsePage({ onOpenProfile, onReport }: BrowsePageProps) {
  const { profile: myProfile } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [photosByUser, setPhotosByUser] = useState<Record<string, Photo[]>>({});
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(99);
  const [sortBy, setSortBy] = useState<SortBy>('online');
  const [searchQuery, setSearchQuery] = useState('');
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>('any');
  const [heightMin, setHeightMin] = useState('');
  const [heightMax, setHeightMax] = useState('');
  const [bodyTypeFilter, setBodyTypeFilter] = useState<BodyType | ''>('');
  const [relationshipFilter, setRelationshipFilter] = useState<RelationshipStatus | ''>('');
  const [smokingFilter, setSmokingFilter] = useState<SmokingHabit | ''>('');
  const [drinkingFilter, setDrinkingFilter] = useState<DrinkingHabit | ''>('');

  const fetchProfiles = useCallback(async () => {
    setLoading(true);

    const [profilesRes, blockedRes, likesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .neq('id', myProfile?.id ?? '')
        .eq('is_banned', false)
        .neq('role', 'admin')
        .order('created_at', { ascending: false }),
      supabase
        .from('blocked_users')
        .select('blocked_id'),
      supabase
        .from('likes')
        .select('liked_id')
        .eq('liker_id', myProfile?.id ?? ''),
    ]);

    if (profilesRes.error) {
      console.error('Failed to load profiles:', profilesRes.error.message);
      setLoading(false);
      return;
    }

    const blockedSet = new Set<string>(
      (blockedRes.data || []).map((b: { blocked_id: string }) => b.blocked_id)
    );
    setBlockedIds(blockedSet);

    const likedSet = new Set<string>(
      (likesRes.data || []).map((l: { liked_id: string }) => l.liked_id)
    );
    setLikedIds(likedSet);

    const profileList = ((profilesRes.data || []) as Profile[]).filter(
      (p) => !blockedSet.has(p.id)
    );

    const { data: photosData, error: photosError } = await supabase
      .from('photos')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: true });

    if (!photosError && photosData) {
      const map: Record<string, Photo[]> = {};
      for (const photo of photosData as Photo[]) {
        if (!map[photo.user_id]) map[photo.user_id] = [];
        map[photo.user_id].push(photo);
      }
      setPhotosByUser(map);
    }

    setProfiles(profileList);
    setLoading(false);
  }, [myProfile?.id]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchProfiles()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProfiles]);

  const handleBlock = async (e: React.MouseEvent, targetId: string, name: string) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('blocked_users')
      .insert({ blocked_id: targetId });
    if (error) {
      toast('Failed to block user', 'error');
    } else {
      toast(`${name} has been blocked`, 'success');
      setBlockedIds((prev) => new Set(prev).add(targetId));
      setProfiles((prev) => prev.filter((p) => p.id !== targetId));
    }
  };

  const handleLike = async (e: React.MouseEvent, targetId: string, name: string) => {
    e.stopPropagation();
    if (likedIds.has(targetId)) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('liker_id', myProfile?.id ?? '')
        .eq('liked_id', targetId);
      if (!error) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ liker_id: myProfile?.id, liked_id: targetId });
      if (!error) {
        setLikedIds((prev) => new Set(prev).add(targetId));
        toast(`You liked ${name}`, 'success');
      }
    }
  };

  const hasAdvancedFilters = !!(
    bodyTypeFilter ||
    relationshipFilter ||
    smokingFilter ||
    drinkingFilter ||
    heightMin ||
    heightMax
  );

  const activeFilterCount =
    (genderFilter !== 'all' ? 1 : 0) +
    (ageMin !== 18 || ageMax !== 99 ? 1 : 0) +
    (distanceFilter !== 'any' ? 1 : 0) +
    (hasAdvancedFilters ? 1 : 0);

  const filtered = profiles
    .filter((p) => {
      if (genderFilter !== 'all' && p.gender !== genderFilter) return false;
      if (p.age < ageMin || p.age > ageMax) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.display_name.toLowerCase().includes(q);
        const matchesLocation = p.location.toLowerCase().includes(q);
        const matchesInterests = p.interests.some((i) => i.toLowerCase().includes(q));
        if (!matchesName && !matchesLocation && !matchesInterests) return false;
      }
      // Distance filter
      if (distanceFilter !== 'any') {
        const maxKm = parseInt(distanceFilter);
        const dist = calculateDistance(
          myProfile?.latitude ?? null,
          myProfile?.longitude ?? null,
          p.latitude,
          p.longitude
        );
        if (dist == null || dist > maxKm) return false;
      }
      // Advanced filters
      if (heightMin && (p.height == null || p.height < Number(heightMin))) return false;
      if (heightMax && (p.height == null || p.height > Number(heightMax))) return false;
      if (bodyTypeFilter && p.body_type !== bodyTypeFilter) return false;
      if (relationshipFilter && p.relationship_status !== relationshipFilter) return false;
      if (smokingFilter && p.smoking !== smokingFilter) return false;
      if (drinkingFilter && p.drinking !== drinkingFilter) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'online':
          if (a.is_online && !b.is_online) return -1;
          if (!a.is_online && b.is_online) return 1;
          return 0;
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'distance': {
          if (!myProfile?.latitude || !myProfile?.longitude) return 0;
          const distA = calculateDistance(
            myProfile.latitude,
            myProfile.longitude,
            a.latitude,
            a.longitude
          );
          const distB = calculateDistance(
            myProfile.latitude,
            myProfile.longitude,
            b.latitude,
            b.longitude
          );
          if (distA == null) return 1;
          if (distB == null) return -1;
          return distA - distB;
        }
        default:
          return 0;
      }
    });

  const onlineCount = filtered.filter((p) => p.is_online).length;

  const clearAllFilters = () => {
    setGenderFilter('all');
    setAgeMin(18);
    setAgeMax(99);
    setDistanceFilter('any');
    setHeightMin('');
    setHeightMax('');
    setBodyTypeFilter('');
    setRelationshipFilter('');
    setSmokingFilter('');
    setDrinkingFilter('');
  };

  return (
    <div className="pt-20 pb-12 px-4 sm:px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-charcoal-700 dark:text-cream-100">
              Discover connections
            </h1>
            <p className="text-sm text-charcoal-400 dark:text-cream-400 mt-1">
              {filtered.length} {filtered.length === 1 ? 'person' : 'people'} nearby
            </p>
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-charcoal-800 border border-cream-200 dark:border-charcoal-700 text-charcoal-600 dark:text-cream-300 font-medium hover:border-terracotta-400 transition-all relative"
          >
            <Filter size={18} />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-terracotta-400 text-white text-xs font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Online Now Counter */}
        {onlineCount > 0 && (
          <div className="flex items-center gap-2 mb-4 animate-fade-in">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-sm font-medium text-charcoal-600 dark:text-cream-300">
              {onlineCount} {onlineCount === 1 ? 'user is' : 'users are'} online now
            </span>
          </div>
        )}

        {/* Search bar */}
        <div className="relative mb-6">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400 dark:text-cream-500"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, location, or interests..."
            className="input-field pl-12"
          />
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="card p-5 mb-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-charcoal-600 dark:text-cream-300">
                Filters
              </h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-terracotta-500 hover:text-terracotta-600 flex items-center gap-1"
                >
                  <X size={14} /> Clear all
                </button>
              )}
            </div>

            {/* Basic filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-2">
                  Gender
                </label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value as GenderFilter)}
                  className="input-field"
                >
                  <option value="all">Everyone</option>
                  <option value="female">Women</option>
                  <option value="male">Men</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-2">
                  Age range: {ageMin} - {ageMax}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={18}
                    max={99}
                    value={ageMin}
                    onChange={(e) => setAgeMin(Math.min(Number(e.target.value), ageMax))}
                    className="flex-1 accent-terracotta-400"
                  />
                  <input
                    type="range"
                    min={18}
                    max={99}
                    value={ageMax}
                    onChange={(e) => setAgeMax(Math.max(Number(e.target.value), ageMin))}
                    className="flex-1 accent-terracotta-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-2">
                  Sort by
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="input-field"
                >
                  <option value="online">Online first</option>
                  <option value="distance">Nearest first</option>
                  <option value="newest">Newest members</option>
                </select>
              </div>
            </div>

            {/* Nearby filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 pt-4 border-t border-cream-200 dark:border-charcoal-700">
              <div>
                <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-2 flex items-center gap-1.5">
                  <MapPin size={14} className="text-terracotta-400" />
                  Nearby distance
                </label>
                <select
                  value={distanceFilter}
                  onChange={(e) => setDistanceFilter(e.target.value as DistanceFilter)}
                  className="input-field"
                >
                  <option value="any">Any distance</option>
                  <option value="5">Within 5 km</option>
                  <option value="10">Within 10 km</option>
                  <option value="25">Within 25 km</option>
                  <option value="50">Within 50 km</option>
                  <option value="100">Within 100 km</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-2 flex items-center gap-1.5">
                  <Ruler size={14} className="text-terracotta-400" />
                  Height range (cm)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={100}
                    max={250}
                    value={heightMin}
                    onChange={(e) => setHeightMin(e.target.value)}
                    className="input-field"
                    placeholder="Min"
                  />
                  <span className="text-charcoal-400">-</span>
                  <input
                    type="number"
                    min={100}
                    max={250}
                    value={heightMax}
                    onChange={(e) => setHeightMax(e.target.value)}
                    className="input-field"
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>

            {/* Advanced filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-cream-200 dark:border-charcoal-700">
              <div>
                <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-2">
                  Body type
                </label>
                <select
                  value={bodyTypeFilter}
                  onChange={(e) => setBodyTypeFilter(e.target.value as BodyType | '')}
                  className="input-field"
                >
                  <option value="">Any</option>
                  <option value="slim">Slim</option>
                  <option value="athletic">Athletic</option>
                  <option value="average">Average</option>
                  <option value="curvy">Curvy</option>
                  <option value="muscular">Muscular</option>
                  <option value="plus-size">Plus-size</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-2">
                  Relationship status
                </label>
                <select
                  value={relationshipFilter}
                  onChange={(e) => setRelationshipFilter(e.target.value as RelationshipStatus | '')}
                  className="input-field"
                >
                  <option value="">Any</option>
                  <option value="single">Single</option>
                  <option value="divorced">Divorced</option>
                  <option value="separated">Separated</option>
                  <option value="widowed">Widowed</option>
                  <option value="in a relationship">In a relationship</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-2">
                  Smoking
                </label>
                <select
                  value={smokingFilter}
                  onChange={(e) => setSmokingFilter(e.target.value as SmokingHabit | '')}
                  className="input-field"
                >
                  <option value="">Any</option>
                  <option value="never">Never</option>
                  <option value="socially">Socially</option>
                  <option value="regularly">Regularly</option>
                  <option value="trying to quit">Trying to quit</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-600 dark:text-cream-300 mb-2">
                  Drinking
                </label>
                <select
                  value={drinkingFilter}
                  onChange={(e) => setDrinkingFilter(e.target.value as DrinkingHabit | '')}
                  className="input-field"
                >
                  <option value="">Any</option>
                  <option value="never">Never</option>
                  <option value="socially">Socially</option>
                  <option value="regularly">Regularly</option>
                  <option value="trying to quit">Trying to quit</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="aspect-[3/4] bg-cream-200 dark:bg-charcoal-700" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-cream-200 dark:bg-charcoal-700 rounded w-2/3" />
                  <div className="h-3 bg-cream-200 dark:bg-charcoal-700 rounded w-1/2" />
                  <div className="flex gap-1.5 pt-1">
                    <div className="h-5 w-12 bg-cream-200 dark:bg-charcoal-700 rounded" />
                    <div className="h-5 w-12 bg-cream-200 dark:bg-charcoal-700 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Compass size={48} className="mx-auto text-charcoal-300 dark:text-charcoal-600 mb-4" />
            <p className="text-charcoal-500 dark:text-cream-400">
              No profiles match your filters. Try adjusting them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                photos={photosByUser[profile.id] || []}
                userLat={myProfile?.latitude ?? null}
                userLon={myProfile?.longitude ?? null}
                isLiked={likedIds.has(profile.id)}
                onClick={() => onOpenProfile(profile)}
                onReport={() => onReport(profile)}
                onBlock={(e) => handleBlock(e, profile.id, profile.display_name)}
                onLike={(e) => handleLike(e, profile.id, profile.display_name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileCard({
  profile,
  photos,
  userLat,
  userLon,
  isLiked,
  onClick,
  onReport,
  onBlock,
  onLike,
}: {
  profile: Profile;
  photos: Photo[];
  userLat: number | null;
  userLon: number | null;
  isLiked: boolean;
  onClick: () => void;
  onReport: () => void;
  onBlock: (e: React.MouseEvent) => void;
  onLike: (e: React.MouseEvent) => void;
}) {
  const primaryPhoto = photos[0];
  const distance = calculateDistance(userLat, userLon, profile.latitude, profile.longitude);

  return (
    <div
      onClick={onClick}
      className="card overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-cream-200 dark:bg-charcoal-700">
        {primaryPhoto ? (
          <img
            src={primaryPhoto.url}
            alt={profile.display_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-cream-400 dark:text-charcoal-500">
            <Users size={48} />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-transparent to-transparent" />

        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReport();
            }}
            className="p-2 rounded-lg bg-charcoal-900/60 backdrop-blur-sm text-cream-100 hover:bg-gold-500 transition-colors"
            aria-label="Report user"
            title="Report user"
          >
            <Flag size={16} />
          </button>
          <button
            onClick={onBlock}
            className="p-2 rounded-lg bg-charcoal-900/60 backdrop-blur-sm text-cream-100 hover:bg-red-500 transition-colors"
            aria-label="Block user"
            title="Block user"
          >
            <Ban size={16} />
          </button>
        </div>

        {/* Like button */}
        <button
          onClick={onLike}
          className="absolute top-3 left-3 p-2 rounded-lg bg-charcoal-900/60 backdrop-blur-sm text-cream-100 hover:bg-terracotta-400 transition-colors"
          aria-label={isLiked ? 'Unlike' : 'Like'}
          title={isLiked ? 'Unlike' : 'Like'}
        >
          <Heart
            size={16}
            fill={isLiked ? 'currentColor' : 'none'}
            className={isLiked ? 'text-terracotta-400' : ''}
          />
        </button>

        {/* Online badge */}
        {profile.is_online && (
          <div className="absolute bottom-3 left-3 badge badge-online">
            <Circle size={8} fill="currentColor" className="text-green-500" />
            Online now
          </div>
        )}

        {/* Distance badge */}
        {distance != null && (
          <div className="absolute bottom-3 right-3 badge badge-distance backdrop-blur-sm">
            <MapPin size={12} />
            {formatDistance(distance)}
          </div>
        )}

        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-bold text-white">{profile.display_name}</h3>
                {profile.is_verified && <VerificationBadge size={16} />}
              </div>
              <p className="text-sm text-cream-200">
                {profile.age} · {profile.gender || '—'} · {profile.location || 'Unknown'}
              </p>
            </div>
            {!profile.is_online && (
              <span className="text-xs text-cream-300">
                {formatLastActive(profile.last_active)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Interests */}
      {profile.interests.length > 0 && (
        <div className="p-4">
          <div className="flex flex-wrap gap-1.5">
            {profile.interests.slice(0, 4).map((interest) => (
              <span key={interest} className="tag">
                {interest}
              </span>
            ))}
            {profile.interests.length > 4 && (
              <span className="text-xs text-charcoal-400 dark:text-cream-500 px-1 py-1">
                +{profile.interests.length - 4} more
              </span>
            )}
          </div>
          {profile.bio && (
            <p className="mt-3 text-sm text-charcoal-500 dark:text-cream-400 line-clamp-2">
              {profile.bio}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
