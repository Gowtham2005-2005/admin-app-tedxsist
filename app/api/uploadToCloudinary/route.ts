import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();
    
    // Upload the image to Cloudinary
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'tedx-certificates', // Optional: specify a folder in your Cloudinary account
    });

    return new Response(JSON.stringify({ 
      success: true, 
      url: result.secure_url 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to upload image' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}