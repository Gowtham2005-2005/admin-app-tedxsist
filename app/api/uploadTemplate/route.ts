import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    // Parse the incoming file data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    // Check the file type
    if (file.type !== 'image/png') {
      return NextResponse.json({ message: 'Invalid file format. Please upload a .png file.' }, { status: 400 });
    }

    // Define the directory for saving files
    const TEMP_DIR = path.join(process.cwd(), 'public', '_TEMP'); // Ensure public/TEMP exists
    await fs.mkdir(TEMP_DIR, { recursive: true });

    // Define the file path
    const filePath = path.join(TEMP_DIR, 'template.png');

    // Save the file to the file system
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, fileBuffer);

    return NextResponse.json({ message: 'File uploaded successfully', filePath }, { status: 200 });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ message: 'Failed to upload the file' }, { status: 500 });
  }
}
