import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { DEFAULT_SLOT_CONFIG, SlotConfig } from '@/lib/slots';



export const GET = async () => {
  try {
    const ref = doc(db, 'config', 'slotConfig');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return NextResponse.json(snap.data() as SlotConfig, { status: 200 });
    }
    // Return defaults if not configured yet
    return NextResponse.json(DEFAULT_SLOT_CONFIG, { status: 200 });
  } catch (error) {
    console.error('Error fetching slot config:', error);
    return NextResponse.json({ message: 'Failed to fetch slot config' }, { status: 500 });
  }
};

export const POST = async (request: Request) => {
  try {
    const body: SlotConfig = await request.json();
    const ref = doc(db, 'config', 'slotConfig');
    await setDoc(ref, { ...body, updatedAt: new Date().toISOString() });
    return NextResponse.json({ message: 'Slot config saved successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error saving slot config:', error);
    return NextResponse.json({ message: 'Failed to save slot config' }, { status: 500 });
  }
};
