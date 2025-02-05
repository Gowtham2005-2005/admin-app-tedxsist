import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Add interface for Cloudinary response
interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Delete all files in the templates folder
    try {
      const searchResult = await cloudinary.search
        .expression('folder:tedx-certificates/templates/*')
        .execute();
      
      if (searchResult.total_count > 0) {
        const deletePromises = searchResult.resources.map((resource: { public_id: string }) => 
          cloudinary.uploader.destroy(resource.public_id)
        );
        await Promise.all(deletePromises);
        console.log('Cleared existing templates');
      }
    } catch (error) {
      console.error('Error clearing templates folder:', error);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary with specific public_id
    const uploadResponse = await new Promise<CloudinaryResponse>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'tedx-certificates/templates',
          public_id: 'template', // This will save as template.png
          resource_type: 'auto',
          overwrite: true // This will overwrite existing file
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as CloudinaryResponse);
        }
      ).end(buffer);
    });

    // Add console log to print the URL
    console.log('Template uploaded successfully. URL:', uploadResponse.secure_url);

    return NextResponse.json({ 
      message: 'Template uploaded successfully',
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
