export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  bloodGroup: string;
  division: string;
  district: string;
  upazila: string;
  role: 'donor' | 'recipient' | 'admin' | 'moderator';
  photoURL?: string;
  donationCount: number;
  lastDonationDate?: string;
  isVerified: boolean;
  isBanned?: boolean;
  fcmToken?: string;
  weight?: number;
  height?: string;
  medicalHistory?: string;
  donationPreferences?: string;
  badge?: string;
  createdAt: string;
  updatedAt: string;
  lat?: number;
  lng?: number;
  invitedBy?: string;
  inviteCount?: number;
  shortId?: string;
  following?: string[];
  followers?: string[];
  bookmarks?: string[];
}

export interface BloodRequest {
  id: string;
  userId: string;
  userName: string;
  requesterId: string;
  requesterName: string;
  bloodGroup: string;
  hospitalName: string;
  location: string;
  district: string;
  division: string;
  unitsNeeded: number;
  reason: string;
  contactPhone: string;
  requiredDate: string;
  status: 'pending' | 'fulfilled' | 'cancelled' | 'open';
  emergencyLevel?: 'normal' | 'urgent' | 'critical';
  note?: string;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  authorId?: string;
  authorName?: string;
  authorPhoto?: string;
  content: string;
  phone?: string;
  media?: string;
  mediaURL?: string;
  mediaType?: 'image' | 'video';
  type: 'general' | 'emergency';
  bloodGroup?: string;
  likes: string[];
  commentsCount: number;
  commentCount?: number;
  hashtags?: string[];
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  authorId?: string;
  authorName?: string;
  authorPhoto?: string;
  text: string;
  content?: string;
  parentId?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'request' | 'match' | 'like' | 'comment' | 'system' | 'social';
  title: string;
  message: string;
  body?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: any;
  read: boolean;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: any;
  unreadCount: { [key: string]: number };
}
