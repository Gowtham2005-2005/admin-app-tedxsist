import { NextResponse } from 'next/server';
import path from 'path';
import { createCanvas, registerFont, loadImage } from 'canvas'; // canvas for text overlay
import { db, collection, getDocs, query, where } from '@/firebase'; // import Firebase functions
import { google } from 'googleapis'; // Google APIs

const drive = google.drive('v3');
const folderName = 'tedxsist';

// OAuth2 Client Setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID, // Your OAuth client ID
  process.env.GOOGLE_CLIENT_SECRET, // Your OAuth client secret
  process.env.GOOGLE_REDIRECT_URI // Your redirect URI
);

// Generate OAuth URL to authorize
const getAuthUrl = () => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
  });
  return authUrl;
};

// Exchange the authorization code for tokens
const handleOAuthRedirect = async (code: string) => {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  console.log('Tokens:', tokens);
  return tokens;
};

// Refresh the access token using the refresh token
const refreshToken = async () => {
  const { tokens } = await oauth2Client.refreshAccessToken();
  oauth2Client.setCredentials(tokens);
  console.log('Refreshed tokens:', tokens);
};

async function uploadToDrive(fileName: string, fileBuffer: Buffer) {
  // Check if OAuth2 credentials are set and valid
  if (!oauth2Client.credentials || !oauth2Client.credentials.access_token) {
    throw new Error('OAuth2 client not authenticated');
  }

  google.options({ auth: oauth2Client });

  // Get the folder ID or create it if it doesn't exist
  const res = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
    fields: 'files(id, name)',
  });

  let folderId = res.data.files?.[0]?.id;

  if (!folderId) {
    // Create the folder if it doesn't exist
    const folder = await drive.files.create({
      resource: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });
    folderId = folder.data.id;
  }

  // Check if a file with the same name exists in the folder
  const fileRes = await drive.files.list({
    q: `'${folderId}' in parents and name='${fileName}'`,
    fields: 'files(id, name)',
  });

  const existingFile = fileRes.data.files?.[0];

  let fileId = existingFile ? existingFile.id : undefined;

  // If a file exists, remove it
  if (fileId) {
    await drive.files.delete({ fileId });
  }

  // Upload the new file
  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const { Readable } = require('stream');
  const fileStream = Readable.from(fileBuffer);

  const media = {
    body: fileStream,
  };

  const file = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id',
  });

  return file.data.id;
}

export async function POST(request: Request) {
  try {
    const { fontSize, color, textX, textY } = await request.json();

    // Fetch participants from Firestore where attend is true
    const participantsRef = collection(db, 'participants');
    const q = query(
      participantsRef,
      where('attend', '==', true),
      where('selected', '==', true)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json(
        { message: 'No participants found or none attending.' },
        { status: 404 }
      );
    }

    // Load template image
    const templatePath = path.join(process.cwd(), 'public', '_TEMP', 'template.png');
    const templateImage = await loadImage(templatePath);
    
    // Load custom font from the public folder
    const fontPath = path.join(process.cwd(), 'public', 'google-fonts', 'font.ttf');
    registerFont(fontPath, { family: 'font' });

    // Loop through participants and generate certificates
    for (const doc of snapshot.docs) {
      const { name } = doc.data();

      // Create canvas
      const canvas = createCanvas(templateImage.width, templateImage.height);
      const ctx = canvas.getContext('2d');

      // Draw template image
      ctx.drawImage(templateImage, 0, 0);

      // Set up font and text properties
      ctx.font = `${fontSize}px "font"`;
      ctx.fillStyle = color;

      const textWidth = ctx.measureText(name).width;
      const calculatedTextX = (templateImage.width - textWidth) / 2;
      const finalTextX = textX !== undefined ? textX : calculatedTextX;
      const finalTextY = textY;

      // Draw name on the certificate
      ctx.fillText(name, finalTextX, finalTextY);

      // Convert canvas to buffer
      const outputBuffer = canvas.toBuffer('image/png');

      // Upload the certificate directly to Google Drive without saving locally
      await uploadToDrive(`${name}.png`, outputBuffer);
      console.log(`${name}'s certificate uploaded successfully.`);
    }

    return NextResponse.json({ message: 'Certificates generated and uploaded.' }, { status: 200 });
  } catch (error) {
    console.error('Error generating certificates:', error);
    return NextResponse.json({ message: 'Failed to generate certificates.' }, { status: 500 });
  }
}
