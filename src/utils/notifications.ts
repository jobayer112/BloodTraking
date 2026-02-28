import { db } from '../firebase/config';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { Notification } from '../types';

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

export const notifyMatchingDonors = async (bloodGroup: string, district: string, requestId: string) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('bloodGroup', '==', bloodGroup),
      where('district', '==', district),
      where('role', '==', 'donor'),
      where('isAvailable', '==', true)
    );

    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map(doc => 
      createNotification(
        doc.id,
        'Emergency Blood Request',
        `A new ${bloodGroup} blood request has been posted in ${district}.`,
        'request',
        `/requests`
      )
    );

    await Promise.all(notifications);
  } catch (error) {
    console.error("Error notifying donors:", error);
  }
};
