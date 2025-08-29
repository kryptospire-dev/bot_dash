
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { App, applicationDefault, cert } from 'firebase-admin/app';

function getFirebaseAdminApp(): App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  let credential;
  
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountString) {
    try {
      const serviceAccount = JSON.parse(serviceAccountString);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      credential = cert(serviceAccount);
    } catch (e: any) {
      console.error(`Failed to parse FIREBASE_SERVICE_ACCOUNT JSON: ${e.message}`);
      credential = applicationDefault();
    }
  } else {
    credential = applicationDefault();
  }

  return admin.initializeApp({
    credential,
  });
}

const app = getFirebaseAdminApp();
const db = getFirestore(app);

export { admin, db };
