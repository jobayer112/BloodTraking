/**
 * Firebase Cloud Functions Example
 * Note: These need to be deployed via Firebase CLI
 */

/*
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// 1. Auto-notify matched donors when a blood request is created
exports.onBloodRequestCreated = functions.firestore
  .document('bloodRequests/{requestId}')
  .onCreate(async (snap, context) => {
    const request = snap.data();
    const { bloodGroup, district, emergencyLevel } = request;

    // Find matching donors
    const donorsSnapshot = await admin.firestore()
      .collection('users')
      .where('bloodGroup', '==', bloodGroup)
      .where('district', '==', district)
      .where('isAvailable', '==', true)
      .get();

    const tokens = [];
    donorsSnapshot.forEach(doc => {
      const donor = doc.data();
      if (donor.fcmToken) {
        tokens.push(donor.fcmToken);
      }
    });

    if (tokens.length > 0) {
      const message = {
        notification: {
          title: `URGENT: ${bloodGroup} Blood Needed!`,
          body: `A ${emergencyLevel} request has been made at ${request.hospitalName}.`,
        },
        tokens: tokens,
      };
      return admin.messaging().sendMulticast(message);
    }
    return null;
  });

// 2. 90-day donation logic: Reset availability if last donation was > 90 days ago
// This can be a scheduled function
exports.checkDonationEligibility = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const donorsSnapshot = await admin.firestore()
    .collection('users')
    .where('isAvailable', '==', false)
    .where('lastDonationDate', '<=', ninetyDaysAgo.toISOString())
    .get();

  const batch = admin.firestore().batch();
  donorsSnapshot.forEach(doc => {
    batch.update(doc.ref, { isAvailable: true });
  });

  return batch.commit();
});
*/
