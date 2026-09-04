export type UserRole = 'admin' | 'user';

export type PhotoStatus = 'pending' | 'approved' | 'rejected';

export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export type Gender = 'male' | 'female' | 'other' | '';

export type BodyType = '' | 'slim' | 'athletic' | 'average' | 'curvy' | 'muscular' | 'plus-size';

export type RelationshipStatus = '' | 'single' | 'divorced' | 'separated' | 'widowed' | 'in a relationship';

export type SmokingHabit = '' | 'never' | 'socially' | 'regularly' | 'trying to quit';

export type DrinkingHabit = '' | 'never' | 'socially' | 'regularly' | 'trying to quit';

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  bio: string;
  age: number;
  gender: Gender;
  location: string;
  latitude: number | null;
  longitude: number | null;
  interests: string[];
  is_online: boolean;
  last_active: string;
  role: UserRole;
  is_banned: boolean;
  is_verified: boolean;
  height: number | null;
  body_type: BodyType;
  relationship_status: RelationshipStatus;
  smoking: SmokingHabit;
  drinking: DrinkingHabit;
  twofa_enabled: boolean;
  deletion_requested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  user_id: string;
  storage_path: string;
  url: string;
  status: PhotoStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details: string;
  status: ReportStatus;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  reporter?: Profile;
  reported?: Profile;
}

export interface Conversation {
  partnerId: string;
  partner: Profile;
  lastMessage: Message;
  unreadCount: number;
}

export interface Like {
  id: string;
  liker_id: string;
  liked_id: string;
  created_at: string;
  liker?: Profile;
}

export interface ProfileView {
  id: string;
  viewer_id: string;
  viewed_id: string;
  created_at: string;
  viewer?: Profile;
}

export const ICEBREAKER_MESSAGES: string[] = [
  "Hi! I loved your profile. What's something you're passionate about?",
  "Hey there! Your photos are great. What's your idea of a perfect weekend?",
  "Hello! I noticed we share some interests. What's the last adventure you went on?",
  "Hi! I'm curious — what's the most spontaneous thing you've ever done?",
  "Hey! I'd love to get to know you. What are you looking for on here?",
  "Hi there! What's a book or movie that completely changed your perspective?",
  "Hello! If you could travel anywhere right now, where would you go?",
  "Hey! I think we'd get along. What's your favorite way to unwind after a long day?",
];
