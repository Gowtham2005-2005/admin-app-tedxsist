import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase-server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { participantId, scannedAt } = body;

    if (!participantId || !scannedAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const participantRef = adminDb.collection('participants').doc(participantId);
    
    // Check if exists
    const snap = await participantRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Mark as entry_scanned and attend
    await participantRef.update({
      entry_scanned: true,
      scanned_at: scannedAt,
      attend: true
    });

    return NextResponse.json({ success: true });
  } catch (error: Error | unknown) {
    console.error('Mark entry error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
