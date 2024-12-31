import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Directory for temporary storage, relative to the project's root
const tempDir = path.join(process.cwd(), 'public', '_TEMP');

// Ensure the _TEMP directory exists
fs.mkdirSync(tempDir, { recursive: true });

// Helper function to generate Excel file
async function generateExcelFile(data: any, filename: string): Promise<string> {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const filePath = path.join(tempDir, filename);

  try {
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    fs.writeFileSync(filePath, excelBuffer); // Save buffer to the file system
  } catch (error) {
    console.error('Error saving the file:', error);
    throw error;
  }

  return filePath;
}

// Helper function to delete the file after a timeout
function deleteFileAfterTimeout(filePath: string, timeout: number) {
  setTimeout(() => {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error deleting file: ${filePath}`, err);
      } else {
        console.log(`File deleted: ${filePath}`);
      }
    });
  }, timeout);
}

// POST API handler to generate the Excel file
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const filename = `Participation_${Date.now()}.xlsx`;

    // Generate the Excel file
    const filePath = await generateExcelFile(data, filename);

    // Delete the file after 10 minutes 
    deleteFileAfterTimeout(filePath, 600000);


    // Return the public URL for downloading the file
    const publicPath = path.join('/_TEMP', filename);
    return NextResponse.json({ message: 'Excel file generated', filePath: publicPath });
  } catch (error) {
    console.error('Error generating Excel file:', error);
    return NextResponse.json({ message: 'Failed to generate Excel file', error: error.message }, { status: 500 });
  }
}
