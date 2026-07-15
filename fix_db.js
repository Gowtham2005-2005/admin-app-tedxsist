const admin = require('firebase-admin');
const serviceAccount = require('./central-app-735d2-firebase-adminsdk-tjvv7-d7bcfc1465.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function fixDB() {
  const db = admin.firestore();
  
  // Fix selection count by updating users who have selection_email_sent == true
  const snapshot = await db.collection('participants').where('selection_email_sent', '==', true).get();
  
  let batch = db.batch();
  snapshot.forEach(doc => {
    if (!doc.data().selected) {
      batch.update(doc.ref, { selected: true });
    }
  });
  
  await batch.commit();
  console.log(`Updated ${snapshot.size} participants to selected: true`);
}

fixDB().then(() => process.exit(0)).catch(console.error);
