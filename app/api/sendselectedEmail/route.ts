import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { generateQRCodeDataUrl } from '@/lib/qrcode';
import { db } from '@/firebase';
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { assignSlots, DEFAULT_SLOT_CONFIG, SlotConfig } from '@/lib/slots';
import 'dotenv/config';

export const POST = async (request: Request) => {
  try {
    const { to, subject, usernames, participantIds } = await request.json();

    // Validate input
    if (!Array.isArray(to) || to.some(email => typeof email !== 'string')) {
      return NextResponse.json({ message: 'Invalid recipient list' }, { status: 400 });
    }
    if (!Array.isArray(usernames) || usernames.length !== to.length) {
      return NextResponse.json({ message: 'Usernames list does not match recipient list' }, { status: 400 });
    }
    if (!Array.isArray(participantIds) || participantIds.length !== to.length) {
      return NextResponse.json({ message: 'Participant IDs list does not match recipient list' }, { status: 400 });
    }

    // ── Fetch slot config from Firestore ──────────────────────────────────
    let slotConfig: SlotConfig = DEFAULT_SLOT_CONFIG;
    try {
      const configRef = doc(db, 'config', 'slotConfig');
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
        slotConfig = configSnap.data() as SlotConfig;
      }
    } catch (e) {
      console.warn('Could not load slot config, using defaults:', e);
    }

    const { slots, eventName, eventDate, eventVenue } = slotConfig;
    // Assign slots round-robin
    const assignedSlots = assignSlots(participantIds, slots);

    // ── SMTP transporter ───────────────────────────────────────────────
    const fromEmail = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');

    if (!fromEmail || !emailPass) {
      console.error('Missing EMAIL_USER or EMAIL_PASS');
      return NextResponse.json(
        { message: 'Server misconfiguration: Missing email credentials' },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: fromEmail,
        pass: emailPass,
      },
    });

    const predefinedSubject = subject || `🎉 You're Selected for ${eventName}!`;

    // ── Send per-recipient in batches ───────────────────────────────────────
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    const BATCH_SIZE = 5;
    const results: PromiseSettledResult<{status: string, email: string}>[] = [];

    for (let i = 0; i < to.length; i += BATCH_SIZE) {
      const batchTo = to.slice(i, i + BATCH_SIZE);
      const batchUsernames = usernames.slice(i, i + BATCH_SIZE);
      const batchParticipantIds = participantIds.slice(i, i + BATCH_SIZE);
      const batchSlots = assignedSlots.slice(i, i + BATCH_SIZE);

      console.log(`Processing email batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(to.length / BATCH_SIZE)}...`);

      const batchPromises = batchTo.map(async (email, index) => {
        const username = batchUsernames[index];
        const participantId = batchParticipantIds[index];
        const slotLabel = batchSlots[index];

        try {
          // Skip if already sent
          const participantRef = doc(db, "participants", participantId);
          const participantSnap = await getDoc(participantRef);

          if (participantSnap.exists() && participantSnap.data().selection_email_sent) {
            console.log(`Email already sent to ${email}, skipping.`);
            return { status: 'skipped', email };
          }

          // Generate local QR with participantId|slotLabel encoded
          const qrCodeDataUrl = await generateQRCodeDataUrl(participantId, slotLabel);
          const cid = `qr_${participantId}@tedxsist.com`;

          const html = buildSelectionEmail({
            username,
            eventName,
            eventDate,
            eventVenue,
            slotLabel,
            qrCodeUrl: `cid:${cid}`,
          });

          await transporter.sendMail({
            from: `"TEDxSIST" <${fromEmail}>`,
            to: email,
            subject: predefinedSubject,
            html,
            attachments: [
              {
                filename: 'entry-qrcode.png',
                path: qrCodeDataUrl,
                cid: cid
              }
            ]
          });

          // Log to Firestore
          await updateDoc(participantRef, {
            selection_email_sent: true,
            assigned_slot: slotLabel,
            email_sent_at: new Date().toISOString(),
          });

          return { status: 'sent', email };
        } catch (error) {
          console.error(`Error sending email to ${email}:`, error);
          throw error;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);

      // Add a 4-second delay between batches to respect Gmail SMTP rate limits
      if (i + BATCH_SIZE < to.length) {
        await delay(4000);
      }
    }

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.length - successCount;

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to send email to ${to[index]}:`, result.reason);
      }
    });

    return NextResponse.json(
      { message: `${successCount} emails sent successfully, ${failureCount} failed.` },
      { status: 200 }
    );
  } catch (error: Error | unknown) {
    console.error('Error while sending email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { message: 'Failed to send email', error: errorMessage },
      { status: 500 }
    );
  }
};

// ── Email Template ────────────────────────────────────────────────────────────
function buildSelectionEmail({
  username,
  eventName,
  eventDate,
  eventVenue,
  slotLabel,
  qrCodeUrl,
}: {
  username: string;
  eventName: string;
  eventDate: string;
  eventVenue: string;
  slotLabel: string;
  qrCodeUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8"/>
  <meta content="width=device-width" name="viewport"/>
  <meta content="IE=edge" http-equiv="X-UA-Compatible"/>
  <title>${eventName} – Selection Confirmation</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet" type="text/css"/>
</head>
<body style="margin:0;padding:0;background-color:#111111;font-family:'Inter',sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#111111;">
  <tr>
    <td align="center" style="padding:40px 16px;">

      <!-- Card -->
      <table width="600" cellpadding="0" cellspacing="0" border="0"
        style="max-width:600px;width:100%;background-color:#1a1a1a;border-radius:20px;overflow:hidden;">

        <!-- Red top bar -->
        <tr>
          <td style="background:linear-gradient(90deg,#E62B1E 0%,#c0392b 100%);height:6px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Header -->
        <tr>
          <td align="center" style="padding:40px 40px 24px;">
            <p style="margin:0 0 8px;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#E62B1E;font-weight:700;">
              TEDxSIST &nbsp;|&nbsp; Ideas Worth Spreading
            </p>
            <h1 style="margin:0;font-size:34px;font-weight:900;color:#ffffff;line-height:1.2;">
              🎉 Congratulations, ${username}!
            </h1>
            <p style="margin:16px 0 0;font-size:16px;color:#aaaaaa;line-height:1.6;">
              You've been selected to attend <strong style="color:#ffffff;">${eventName}</strong>.<br/>
              We're thrilled to have you join us for an unforgettable experience.
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 40px;">
            <div style="height:1px;background-color:#2e2e2e;"></div>
          </td>
        </tr>

        <!-- Event Details -->
        <tr>
          <td style="padding:32px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="50%" style="vertical-align:top;padding-right:12px;">
                  <table cellpadding="0" cellspacing="0" border="0"
                    style="background-color:#242424;border-radius:12px;width:100%;">
                    <tr>
                      <td style="padding:20px 24px;">
                        <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#E62B1E;font-weight:700;">📅 Event Date</p>
                        <p style="margin:0;font-size:16px;color:#ffffff;font-weight:600;">${eventDate}</p>
                      </td>
                    </tr>
                  </table>
                </td>
                <td width="50%" style="vertical-align:top;padding-left:12px;">
                  <table cellpadding="0" cellspacing="0" border="0"
                    style="background-color:#242424;border-radius:12px;width:100%;">
                    <tr>
                      <td style="padding:20px 24px;">
                        <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#E62B1E;font-weight:700;">📍 Venue</p>
                        <p style="margin:0;font-size:16px;color:#ffffff;font-weight:600;">${eventVenue}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Arrival Slot Highlight -->
        <tr>
          <td style="padding:0 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
              style="background:linear-gradient(135deg,#E62B1E22 0%,#E62B1E11 100%);border:1.5px solid #E62B1E55;border-radius:16px;">
              <tr>
                <td align="center" style="padding:28px 24px;">
                  <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#E62B1E;font-weight:700;">
                    ⏰ Your Arrival Slot
                  </p>
                  <p style="margin:0;font-size:36px;font-weight:900;color:#ffffff;letter-spacing:1px;">
                    ${slotLabel}
                  </p>
                  <p style="margin:12px 0 0;font-size:13px;color:#aaaaaa;line-height:1.5;">
                    Please arrive <strong style="color:#ffffff;">within your assigned slot</strong> to ensure a smooth entry.<br/>
                    Entry outside your slot may not be permitted.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- QR Section -->
        <tr>
          <td align="center" style="padding:0 40px 32px;">
            <p style="margin:0 0 16px;font-size:13px;text-transform:uppercase;letter-spacing:2px;color:#aaaaaa;font-weight:600;">
              Your Entry QR Code
            </p>
            <table cellpadding="0" cellspacing="0" border="0"
              style="background-color:#242424;border-radius:16px;overflow:hidden;">
              <tr>
                <td style="padding:24px;">
                  <img src="${qrCodeUrl}" width="220" height="220" border="0"
                    alt="Entry QR Code"
                    style="display:block;width:220px;height:220px;border-radius:12px;"/>
                </td>
              </tr>
            </table>
            <p style="margin:12px 0 0;font-size:12px;color:#666666;">
              Show this QR code at the venue entrance during your slot.<br/>
              Do not share this code with anyone.
            </p>
          </td>
        </tr>

        <!-- Instructions -->
        <tr>
          <td style="padding:0 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
              style="background-color:#1e1e1e;border-radius:12px;border-left:3px solid #E62B1E;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#ffffff;">📋 Important Instructions</p>
                  <ul style="margin:0;padding:0 0 0 18px;color:#aaaaaa;font-size:13px;line-height:1.8;">
                    <li>Arrive within your designated time slot</li>
                  </ul>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 40px;">
            <div style="height:1px;background-color:#2e2e2e;"></div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:28px 40px 36px;">
            <p style="margin:0 0 4px;font-size:13px;color:#666666;">
              Questions? Reach us at
              <a href="mailto:tedxsist@gmail.com" style="color:#E62B1E;text-decoration:none;">tedxsist@gmail.com</a>
            </p>
            <p style="margin:0;font-size:12px;color:#444444;">
              © 2026 TEDxSIST &nbsp;|&nbsp; Sathyabama Institute of Science and Technology
            </p>
          </td>
        </tr>

        <!-- Red bottom bar -->
        <tr>
          <td style="background:linear-gradient(90deg,#E62B1E 0%,#c0392b 100%);height:4px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`;
}
