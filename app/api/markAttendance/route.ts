import { adminDb } from '@/firebase-admin'; // Import Firebase Admin SDK
import { NextRequest, NextResponse } from 'next/server';

// API endpoint to get participant data based on QR result
export async function GET(request: NextRequest) {
  const qrResult = request.nextUrl.searchParams.get('qrResult');
  if (!qrResult) {
    return NextResponse.json({ error: 'QR result not provided' }, { status: 400 });
  }

  try {
    // Query the collection to find the document where 'id' matches qrResult
    const participantQuery = await adminDb.collection('participants').where('id', '==', qrResult).get();

    if (participantQuery.empty) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Get the first matching document
    const participantDoc = participantQuery.docs[0];
    const data = participantDoc.data();

    // Return participant data
    return NextResponse.json({
      ...data,
      id: data?.id || qrResult, // Use data.id if exists, fallback to qrResult
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

    // Query the collection to find the document where 'id' matches qrResult
    const participantQuery = await adminDb.collection('participants').where('id', '==', qrResult).get();

    if (participantQuery.empty) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Get the first matching document
    const participantDoc = participantQuery.docs[0];
    const participantRef = participantDoc.ref;
    const data = participantDoc.data();

    // Update attendance using admin SDK
    await participantRef.update({
      attend: true,
      timestamp: qrResultTimestamp,
      markedBy: userName,
    });

    // Return updated participant data
    return NextResponse.json({
      ...data,
      id: data?.id || qrResult, // Use data.id if exists, fallback to qrResult
      attend: true,
      timestamp: qrResultTimestamp,
      markedBy: userName,
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
