import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { db } from '@/firebase';
import { doc, updateDoc, getDoc } from "firebase/firestore";
import 'dotenv/config';

export const POST = async (request: Request) => {
  try {
    const { to, usernames, participantIds } = await request.json();

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

    const predefinedSubject = `Update on your TEDxSIST 2026 Registration`;

    // ── Send per-recipient in batches ───────────────────────────────────────
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    const BATCH_SIZE = 5;
    const results: PromiseSettledResult<{status: string, email: string}>[] = [];

    for (let i = 0; i < to.length; i += BATCH_SIZE) {
      const batchTo = to.slice(i, i + BATCH_SIZE);
      const batchUsernames = usernames.slice(i, i + BATCH_SIZE);
      const batchParticipantIds = participantIds.slice(i, i + BATCH_SIZE);

      console.log(`Processing rejection email batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(to.length / BATCH_SIZE)}...`);

      const batchPromises = batchTo.map(async (email, index) => {
        const username = batchUsernames[index];
        const participantId = batchParticipantIds[index];

        try {
          // Skip if already sent
          const participantRef = doc(db, "participants", participantId);
          const participantSnap = await getDoc(participantRef);

          if (participantSnap.exists() && participantSnap.data().rejection_email_sent) {
            console.log(`Rejection email already sent to ${email}, skipping.`);
            return { status: 'skipped', email };
          }

          const html = buildRejectionEmail({ username });

          await transporter.sendMail({
            from: `"TEDxSIST" <${fromEmail}>`,
            to: email,
            subject: predefinedSubject,
            html,
          });

          // Log to Firestore
          await updateDoc(participantRef, {
            rejection_email_sent: true,
            emailsent: true,
            email_sent_at: new Date().toISOString(),
          });

          return { status: 'sent', email };
        } catch (error) {
          console.error(`Error sending rejection email to ${email}:`, error);
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
function buildRejectionEmail({ username }: { username: string }): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8"/>
  <meta content="width=device-width" name="viewport"/>
  <meta content="IE=edge" http-equiv="X-UA-Compatible"/>
  <title>TEDxSIST 2026 – Update</title>
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
            <h1 style="margin:0;font-size:30px;font-weight:800;color:#ffffff;line-height:1.2;">
              Hi ${username},
            </h1>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 40px;">
            <div style="height:1px;background-color:#2e2e2e;"></div>
          </td>
        </tr>

        <!-- Body Content -->
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 20px;font-size:16px;color:#aaaaaa;line-height:1.6;">
              Thank you so much for taking the time to apply for <strong>TEDxSIST 2026</strong>. We were genuinely overwhelmed by the incredible response and the passion shown by all applicants.
            </p>
            <p style="margin:0 0 20px;font-size:16px;color:#aaaaaa;line-height:1.6;">
              Due to strict venue capacity limits, we had to make some very difficult decisions. Unfortunately, we are unable to offer you a spot at this year's event.
            </p>
            <p style="margin:0 0 20px;font-size:16px;color:#aaaaaa;line-height:1.6;">
              Please know that this is not a reflection of your ideas or your enthusiasm. We would love to have you involved in our future events and initiatives!
            </p>
            <p style="margin:0;font-size:16px;color:#aaaaaa;line-height:1.6;">
              Thank you again for your interest, and keep spreading great ideas!
            </p>
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
              Have questions? Reach out to us at
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
