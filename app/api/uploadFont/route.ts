import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function clearFontFolder() {
  try {
    console.log('Checking for existing fonts...');
    const searchResult = await cloudinary.search
      .expression('folder:tedx-certificates/fonts/*')
      .max_results(100)  // Increase if you expect more files
      .execute();
    
    if (searchResult.total_count > 0) {
      console.log(`Found ${searchResult.total_count} existing fonts. Clearing folder...`);
      
      // Delete each resource one by one
      for (const resource of searchResult.resources) {
        try {
          console.log(`Deleting font: ${resource.public_id}`);
          await cloudinary.uploader.destroy(resource.public_id, { 
            resource_type: 'raw',
            invalidate: true 
          });
        } catch (deleteError) {
          console.error(`Failed to delete ${resource.public_id}:`, deleteError);
        }
      }
      
      console.log('Successfully emptied fonts folder');
    } else {
      console.log('No existing fonts found');
    }
  } catch (error) {
    console.error('Error while clearing fonts folder:', error);
    throw new Error('Failed to clear fonts folder');
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No valid file uploaded' }, { status: 400 });
    }

    // Check file name and extension
    const filename = (file as any).name || 'uploaded-font';
    const fileExtension = filename.split('.').pop()?.toLowerCase();
    
    if (!['ttf', 'otf'].includes(fileExtension || '')) {
      return NextResponse.json({ error: 'Invalid file type. Please upload a .ttf or .otf font file.' }, { status: 400 });
    }

    // Clear the fonts folder before uploading
    await clearFontFolder();

    // Convert file to base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64File = buffer.toString('base64');
    const dataURI = `data:application/x-font-${fileExtension};base64,${base64File}`;

    console.log('Uploading new font to Cloudinary...');
    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(dataURI, {
      resource_type: 'raw',
      folder: 'tedx-certificates/fonts',
      public_id: 'font',  // Will save as font.ttf or font.otf
      format: fileExtension,
      overwrite: true,
      invalidate: true
    });

    console.log('Font uploaded successfully. URL:', uploadResponse.secure_url);

    return NextResponse.json({ 
      message: 'Font uploaded successfully!',
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
      format: fileExtension
    });

  } catch (error) {
    console.error('Error handling font upload:', error);
    return NextResponse.json({ 
      error: 'Failed to upload the font file. Please try again.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
