import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to generate Excel file
function generateExcel(data: any): Buffer {
  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  
  // Write to buffer
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
}

// Function to clear Cloudinary excel file
async function clearExistingExcelFile() {
  try {
    await cloudinary.uploader.destroy(
      'tedx-certificates/excel/excel',
      { resource_type: 'raw' }
    );
    console.log('Cleared existing excel file');
  } catch (error) {
    console.log('No existing excel file found or error clearing:', error);
  }
}

// POST handler to generate and upload Excel file
export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Generate Excel buffer
    const excelBuffer = generateExcel(data);
    
    // Convert to base64
    const base64 = excelBuffer.toString('base64');
    const dataURI = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      folder: 'tedx-certificates/excel',
      public_id: 'participants',
      resource_type: 'raw',
      format: 'xlsx',
      overwrite: true
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
      message: 'Excel file generated successfully'
    });

  } catch (error) {
    console.error('Error generating Excel file:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Failed to generate Excel file', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

