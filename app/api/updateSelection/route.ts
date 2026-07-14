import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase-server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const participants = body.participants;
    
    if (!participants || !Array.isArray(participants)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const batch = adminDb.batch();
    const selectedCounterRef = adminDb.collection('selected').doc('selected');
    let delta = 0;

    for (const p of participants) {
      batch.update(adminDb.collection('participants').doc(p.id), {
        selected: p.selected
      });
      delta += p.selected ? 1 : -1;
    }

    if (delta !== 0) {
      batch.set(selectedCounterRef, { count: FieldValue.increment(delta) }, { merge: true });
    }

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error: Error | unknown) {
    console.error('Update selection error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
