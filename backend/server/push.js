import admin from 'firebase-admin';
let init = false;
export function initFirebase() {
  if (!init && process.env.FIREBASE_PROJECT_ID) {
    try { admin.initializeApp({ credential: admin.credential.applicationDefault() }); init = true; } catch (e) { console.warn('Firebase skip:', e.message); }
  }
}
export async function sendPush(token, title, body) {
  if (!init || !token) return;
  return admin.messaging().send({ token, notification: { title, body } });
}
