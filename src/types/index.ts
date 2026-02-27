export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type UserRole = 'donor' | 'receiver' | 'admin';
export type EmergencyLevel = 'normal' | 'urgent' | 'critical';
export type RequestStatus = 'open' | 'fulfilled' | 'cancelled';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  bloodGroup: BloodGroup;
  division: string;
  district: string;
  upazila: string;
  weight?: number;
  height?: string;
  lastDonationDate: string | null;
  donationCount: number;
  isAvailable: boolean;
  isVerified: boolean;
  role: UserRole;
  fcmToken?: string;
  createdAt: string;
  updatedAt: string;
  photoURL?: string;
}

export interface BloodRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  bloodGroup: BloodGroup;
  emergencyLevel: EmergencyLevel;
  hospitalName: string;
  location: string;
  division: string;
  district: string;
  requiredDate: string;
  status: RequestStatus;
  note?: string;
  contactPhone: string;
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  type: 'general' | 'emergency';
  likes: string[]; // Array of user UIDs
  commentCount: number;
  createdAt: string;
  mediaURL?: string;
  mediaType?: 'image' | 'video';
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'request' | 'match' | 'social' | 'admin';
  isRead: boolean;
  createdAt: string;
  link?: string;
}
