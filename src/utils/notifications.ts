import { db } from '../firebase/config';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { Notification, UserProfile } from '../types';
import { canDonate } from './helpers';

export const createNotification = async (
  userId: string,
  title: string,
  body: string,
  type: Notification['type'],
  link?: string
) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      body,
      type,
      isRead: false,
      link: link || null,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

export const notifyAllUsers = async (
  title: string,
  body: string,
  type: Notification['type'],
  link?: string,
  excludeUserId?: string
) => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    const users = snapshot.docs
      .map(doc => doc.id)
      .filter(id => id !== excludeUserId);
    
    const notifications = users.map(userId => 
      createNotification(
        userId,
        title,
        body,
        type,
        link
      )
    );

    await Promise.all(notifications);
  } catch (error) {
    console.error("Error notifying all users:", error);
  }
};
export const notifyMatchingDonors = async (bloodGroup: string, district: string, requestId: string) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('bloodGroup', '==', bloodGroup),
      where('district', '==', district),
      where('role', '==', 'donor')
    );

    const snapshot = await getDocs(q);
    const eligibleDonors = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as UserProfile & { id: string }))
      .filter(donor => canDonate(donor.lastDonationDate));

    const notifications = eligibleDonors.map(donor => 
      createNotification(
        donor.id,
        'Emergency Blood Request',
        `A new ${bloodGroup} blood request has been posted in ${district}.`,
        'request',
        `/requests?id=${requestId}`
      )
    );

    await Promise.all(notifications);
  } catch (error) {
    console.error("Error notifying donors:", error);
  }
};
