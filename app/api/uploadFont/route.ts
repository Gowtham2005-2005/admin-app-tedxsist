import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Get the uploaded file
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Manually check file extension
    const filename = file.name;
    const fileExtension = path.extname(filename).toLowerCase();

    const allowedExtensions = ['.ttf', '.otf'];
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({ error: 'Please upload a valid font file (.ttf or .otf)' }, { status: 400 });
    }

    // Define the destination path for saving the file
    const destinationPath = path.join(process.cwd(), 'public/google-fonts', `font${fileExtension}`);

    // Ensure the target directory exists
    const dirPath = path.dirname(destinationPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Convert the Blob to a Buffer and write to file system
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(destinationPath, buffer);

    return NextResponse.json({ message: 'Font uploaded and saved successfully!' });
  } catch (error) {
    console.error('Error handling file upload:', error);
    return NextResponse.json({ error: 'Failed to upload the font file' }, { status: 500 });
  }
}
