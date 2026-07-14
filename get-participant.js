const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function main() {
  const email = 'kshrutikanth@gmail.com';
  let snapshot = await db.collection('participants').where('email', '==', email).get();
  
  if (snapshot.empty) {
    console.log('Participant not found. Creating a test one...');
    const id = require('crypto').randomUUID();
    await db.collection('participants').doc(email).set({
      id: id,
      name: 'Kshrutikanth',
      email: email,
      selected: true,
      emailsent: false
    });
    console.log(JSON.stringify({ id, name: 'Kshrutikanth', email }));
  } else {
    const doc = snapshot.docs[0];
    await doc.ref.update({
      selection_email_sent: false,
      emailsent: false
    });
    console.log(JSON.stringify({ id: doc.data().id, name: doc.data().name, email: doc.data().email }));
  }
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
