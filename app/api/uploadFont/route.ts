import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Get the uploaded file
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No valid file uploaded' }, { status: 400 });
    }

    // Check file name and extension
    const filename = (file as any).name || 'uploaded-font';
    const fileExtension = path.extname(filename).toLowerCase();
    const allowedExtensions = ['.ttf', '.otf'];

    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({ error: 'Invalid file type. Please upload a .ttf or .otf font file.' }, { status: 400 });
    }

    // Define paths
    const destinationPath = path.join(process.cwd(), 'public/google-fonts', `font${fileExtension}`);
    const tempPath = path.join(process.cwd(), 'public/google-fonts', `temp-font${fileExtension}`);

    // Ensure the target directory exists
    const dirPath = path.dirname(destinationPath);
    await fs.mkdir(dirPath, { recursive: true });

    // Write the uploaded file to the temp path
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempPath, buffer);

    // Delete the existing font file if it exists
    if (await fs.stat(destinationPath).catch(() => false)) {
      await fs.unlink(destinationPath);
    }

    // Copy the temp file to the destination
    await fs.copyFile(tempPath, destinationPath);

    // Delete the temporary file
    await fs.unlink(tempPath);

    return NextResponse.json({ message: 'Font uploaded and saved successfully!', path: destinationPath });
  } catch (error) {
    console.error('Error handling file upload:', error);
    return NextResponse.json({ error: 'Failed to upload the font file. Please try again.' }, { status: 500 });
  }
}
