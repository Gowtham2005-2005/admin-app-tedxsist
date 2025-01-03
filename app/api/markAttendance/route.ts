import { db, doc, getDoc, updateDoc } from '@/firebase'; // Import Firestore functions
import { NextRequest, NextResponse } from 'next/server';

// API endpoint to get participant data based on QR result
export async function GET(request: NextRequest) {
  const qrResult = request.nextUrl.searchParams.get('qrResult');
  if (!qrResult) {
    return NextResponse.json({ error: 'QR result not provided' }, { status: 400 });
  }

  try {


    const participantRef = doc(db, 'participants', qrResult);
    const participantDoc = await getDoc(participantRef);

    if (!participantDoc.exists()) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    return NextResponse.json(participantDoc.data());
  } catch (error) {
    console.error('Error fetching participant data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// API endpoint to mark attendance
export async function POST(request: NextRequest) {
  try {
    const { qrResult, qrResultTimestamp,userName } = await request.json();

    if (!qrResult || !qrResultTimestamp || !userName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const participantRef = doc(db, 'participants', qrResult);
    const participantDoc = await getDoc(participantRef);

    if (!participantDoc.exists()) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    await updateDoc(participantRef, {
      attend: true,
      timestamp: qrResultTimestamp,
      markedBy: userName,
    });

    const updatedParticipant = {
      id: participantDoc.id,
      ...participantDoc.data(),
    };

    return NextResponse.json(updatedParticipant);
  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
