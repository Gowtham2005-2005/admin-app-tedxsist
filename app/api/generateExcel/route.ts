import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Function to generate Excel buffer
function generateExcel(data: any): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
}

// Function to clear existing file in Cloudinary
async function clearExistingExcelFile() {
  try {
    await cloudinary.uploader.destroy('tedx-certificates/excel/participants', { resource_type: 'raw' });
    console.log('Cleared existing Excel file');
  } catch (error) {
    console.log('No existing Excel file found or error clearing:', error);
  }
}

// POST handler to generate and upload Excel file
export async function POST(req: Request) {
  try {
    console.log('Processing request...');

    // Verify Cloudinary configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Missing Cloudinary configuration');
    }

    // Parse request JSON
    const data = await req.json();
    console.log('Received Data:', data);

    // Generate Excel buffer
    const excelBuffer = generateExcel(data);

    // Save buffer to a proper temp directory
    const tempDir = os.tmpdir(); // Get OS-specific temp directory
    const tempFilePath = path.join(tempDir, 'participants.xlsx');
    await writeFile(tempFilePath, excelBuffer);
    console.log('Excel file written to:', tempFilePath);

    // Clear existing file before upload
    await clearExistingExcelFile();

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
      folder: 'tedx-certificates/excel',
      public_id: 'participants',
      resource_type: 'raw',
      format: 'xlsx',
      overwrite: true,
      use_filename: true,
      unique_filename: false
    });

    console.log('Upload successful:', uploadResult.secure_url);

    // Remove the temporary file
    await unlink(tempFilePath);

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
      message: 'Excel file generated successfully'
    });

  } catch (error) {
    console.error('Error generating Excel file:', error);
    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url, // This is the Cloudinary URL
      message: 'Excel file generated successfully'
    });
  }
}


