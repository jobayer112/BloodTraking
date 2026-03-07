importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBfbLiTNuU0FFTgAosqQ5GQKPAMDfuyo3w",
  authDomain: "register-7df95.firebaseapp.com",
  databaseURL: "https://register-7df95-default-rtdb.firebaseio.com",
  projectId: "register-7df95",
  storageBucket: "register-7df95.firebasestorage.app",
  messagingSenderId: "672996110076",
  appId: "1:672996110076:web:c86089000750cdbf973179",
  measurementId: "G-N1TQTWV3MZ"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png' // Make sure you have this icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
