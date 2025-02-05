import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import 'dotenv/config';

export const POST = async (request: Request) => {
  try {
    const { to, subject, usernames } = await request.json(); // Expect 'to' and 'usernames' in the body

    // Validate input
    if (!Array.isArray(to) || to.some(email => typeof email !== 'string')) {
      return NextResponse.json({ message: 'Invalid recipient list' }, { status: 400 });
    }

    if (!Array.isArray(usernames) || usernames.length !== to.length) {
      return NextResponse.json({ message: 'Usernames list does not match recipient list' }, { status: 400 });
    }

    // Predefined subject and text template
    const predefinedSubject = subject || 'TEDx Registration';
    const predefinedTextTemplate = 'Hi $username, you have been successfully registered for TEDx!';
    const predefinedHTMLTemplate = `
      <p>Hi <strong>$username</strong>,</p>
      <p>You have been selected for <strong>TEDx</strong>!</p>
      <p>We’re excited to have you on board.</p>
    `;

    // Set email credentials
    const emailUser = process.env.EMAIL_USER || 'aravinthasokan05@gmail.com';
    const emailPass = process.env.EMAIL_PASS; // App password

    if (!emailUser || !emailPass) {
      console.error('Missing email credentials in environment variables');
      return NextResponse.json(
        { message: 'Server misconfiguration: Missing email credentials' },
        { status: 500 }
      );
    }

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    // Send email to each recipient with personalized text
    const sendEmailPromises = to.map((email, index) => {
      const username = usernames[index]; // Match username to the email
      const personalizedText = predefinedTextTemplate.replace('$username', username);
      const personalizedHTML = predefinedHTMLTemplate.replace('$username', username);

      const mailOptions = {
        from: emailUser,
        to: email,
        subject: predefinedSubject,
        text: personalizedText,
        html: personalizedHTML,
      };

      return transporter.sendMail(mailOptions);
    });

    // Await all email sending promises
    const results = await Promise.allSettled(sendEmailPromises);

    // Calculate success and failure counts
    const successCount = results.filter(result => result.status === 'fulfilled').length;
    const failureCount = results.length - successCount;

    return NextResponse.json(
      {
        message: `${successCount} emails sent successfully, ${failureCount} failed.`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error while sending email:', error);
    return NextResponse.json(
      { message: 'Failed to send email', error: error.response || error.message },
      { status: 500 }
    );
  }
};
