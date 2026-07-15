import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase-server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Participant ID is required' }, { status: 400 });
    }

    const participantRef = adminDb.collection('participants').doc(id);
    const snap = await participantRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    return NextResponse.json({ data: snap.data() });
  } catch (error: Error | unknown) {
    console.error('Get participant error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
