import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createCanvas, registerFont, loadImage } from 'canvas'; // canvas for text overlay

export async function POST(request: Request) {
  try {
    // Extract dimensions, name, and text properties from request body
    const { name, fontSize, color, textX, textY } = await request.json();

    if (!name || !fontSize || !color || textY === undefined) {
      return NextResponse.json(
        { message: 'Invalid dimensions, missing name, or missing text properties' },
        { status: 400 }
      );
    }

    // Load template image (template.png) from the public folder
    const templatePath = path.join(process.cwd(), 'public', '_TEMP', 'template.png');
    const templateImage = await loadImage(templatePath);

    // Create a canvas to draw the text over the image
    const canvas = createCanvas(templateImage.width, templateImage.height);
    const ctx = canvas.getContext('2d');

    // Register the custom font
    const fontPath = path.join(process.cwd(), 'public', 'google-fonts', 'font.ttf');
    try {
      // Check if font file exists
      await fs.access(fontPath); // Will throw an error if file is missing
    } catch (err) {
      console.error('Font file not found or inaccessible:', fontPath);
      throw new Error('Font file is missing');
    }
    console.log('Font path:', fontPath);

    registerFont(fontPath, { family: 'CustomFont' });

    // Draw the template image on the canvas
    ctx.drawImage(templateImage, 0, 0);

    // Set up the font and text color based on the request
    ctx.font = `${fontSize}px "CustomFont"`; // Ensure it explicitly uses your registered font
    ctx.fillStyle = color;

    // Calculate the text width to center it (if desired)
    const textWidth = ctx.measureText(name).width;
    const calculatedTextX = (templateImage.width - textWidth) / 2; // Center horizontally
    const finalTextX = textX !== undefined ? textX : calculatedTextX; // Use provided textX or calculated one
    const finalTextY = textY; // Use provided textY

    // Draw the text
    ctx.fillText(name, finalTextX, finalTextY);

    // Convert the canvas to a PNG buffer
    const outputBuffer = canvas.toBuffer('image/png');

    // Save the generated image to the file system
    const outputImagePath = path.join(process.cwd(), 'public', '_TEMP', 'sample.png');
    await fs.writeFile(outputImagePath, outputBuffer);

    // Return the response with the file path
    return NextResponse.json({ message: 'Sample generated', filePath: outputImagePath }, { status: 200 });
  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json({ message: 'Failed to generate certificate' }, { status: 500 });
  }
}
