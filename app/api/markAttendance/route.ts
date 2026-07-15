import { adminDb } from '@/firebase-admin'; // Import Firebase Admin SDK
import { NextRequest, NextResponse } from 'next/server';

// API endpoint to get participant data based on QR result
export async function GET(request: NextRequest) {
  const qrResult = request.nextUrl.searchParams.get('qrResult');
  if (!qrResult) {
    return NextResponse.json({ error: 'QR result not provided' }, { status: 400 });
  }

  try {
    const qrParts = qrResult.split('|');
    const participantId = qrParts[0];

    let participantDoc;
    let data;

    // First try querying by document ID (which is the email for new users)
    const docRef = adminDb.collection('participants').doc(participantId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      participantDoc = docSnap;
      data = docSnap.data();
    } else {
      // Fallback to query by inner 'id' field (UUID for old users)
      const participantQuery = await adminDb.collection('participants').where('id', '==', participantId).get();
      if (!participantQuery.empty) {
        participantDoc = participantQuery.docs[0];
        data = participantDoc.data();
      } else {
        return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
      }
    }

    // Return participant data
    return NextResponse.json({
      ...data,
      id: participantDoc.id, // Use the doc ID
    });
  } catch (error) {
    console.error('Error fetching participant data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// API endpoint to mark attendance
export async function POST(request: NextRequest) {
  try {
    const { qrResult, qrResultTimestamp, userName } = await request.json();

    if (!qrResult || !qrResultTimestamp || !userName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const qrParts = qrResult.split('|');
    const participantId = qrParts[0];

    let participantDoc;
    let participantRef;
    let data;

    // First try querying by document ID (which is the email for new users)
    const docRef = adminDb.collection('participants').doc(participantId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      participantDoc = docSnap;
      participantRef = docRef;
      data = docSnap.data();
    } else {
      // Fallback to query by inner 'id' field (UUID for old users)
      const participantQuery = await adminDb.collection('participants').where('id', '==', participantId).get();
      if (!participantQuery.empty) {
        participantDoc = participantQuery.docs[0];
        participantRef = participantDoc.ref;
        data = participantDoc.data();
      } else {
        return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
      }
    }

    // Update attendance using admin SDK
    await participantRef.update({
      attend: true,
      timestamp: qrResultTimestamp,
      markedBy: userName,
    });

    // Return updated participant data
    return NextResponse.json({
      ...data,
      id: participantDoc.id, // Use the doc ID
      attend: true,
      timestamp: qrResultTimestamp,
      markedBy: userName,
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
