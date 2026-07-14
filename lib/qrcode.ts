import QRCode from 'qrcode';

/**
 * Generates a QR code data URL using the qrcode library.
 * The QR data encodes: "participantId|slotLabel"
 * so the scanner can validate both identity and time slot.
 *
 * @param participantId - The Firestore participant document ID
 * @param slotLabel - The assigned arrival slot (e.g. "09:00 – 09:15")
 * @returns Promise<string> - The Base64 Data URL of the generated QR code image
 */
export async function generateQRCodeDataUrl(participantId: string, slotLabel = ''): Promise<string> {
  try {
    const qrData = slotLabel
      ? `${participantId}|${slotLabel}`
      : participantId;

    // Generate a Base64 data URL
    const dataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      width: 520,
      margin: 2
    });

    return dataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}
