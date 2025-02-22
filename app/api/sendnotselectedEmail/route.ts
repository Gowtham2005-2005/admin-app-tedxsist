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
     <!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">

<head>
<meta charset="utf-8" />
<meta content="width=device-width" name="viewport" />
<meta content="IE=edge" http-equiv="X-UA-Compatible" />
<meta name="x-apple-disable-message-reformatting" />
<meta content="telephone=no,address=no,email=no,date=no,url=no" name="format-detection" />
<title>Template</title>
<!--[if mso]>
            <style>
                * {
                    font-family: sans-serif !important;
                }
            </style>
        <![endif]-->
<!--[if !mso]><!-->
<!-- <![endif]-->
<link href="https://fonts.googleapis.com/css?family=Inter:900" rel="stylesheet" type="text/css">
<link href="https://fonts.googleapis.com/css?family=Inter:800" rel="stylesheet" type="text/css">
<link href="https://fonts.googleapis.com/css?family=Open Sans:400" rel="stylesheet" type="text/css">
<link href="https://fonts.googleapis.com/css?family=Inter:400" rel="stylesheet" type="text/css">
<style>
html {
    margin: 0 !important;
    padding: 0 !important;
}

* {
    -ms-text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
}
td {
    vertical-align: top;
    mso-table-lspace: 0pt !important;
    mso-table-rspace: 0pt !important;
}
a {
    text-decoration: none;
}
img {
    -ms-interpolation-mode:bicubic;
}
@media only screen and (min-device-width: 320px) and (max-device-width: 374px) {
    u ~ div .email-container {
        min-width: 320px !important;
    }
}
@media only screen and (min-device-width: 375px) and (max-device-width: 413px) {
    u ~ div .email-container {
        min-width: 375px !important;
    }
}
@media only screen and (min-device-width: 414px) {
    u ~ div .email-container {
        min-width: 414px !important;
    }
}

</style>
<!--[if gte mso 9]>
        <xml>
            <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
        <![endif]-->
<style>
@media only screen and (max-device-width: 599px), only screen and (max-width: 599px) {

    .eh {
        height:auto !important;
    }
    .desktop {
        display: none !important;
        height: 0 !important;
        margin: 0 !important;
        max-height: 0 !important;
        overflow: hidden !important;
        padding: 0 !important;
        visibility: hidden !important;
        width: 0 !important;
    }
    .mobile {
        display: block !important;
        width: auto !important;
        height: auto !important;
        float: none !important;
    }
    .email-container {
        width: 100% !important;
        margin: auto !important;
    }
    
    .wid-auto {
        width:auto !important;
    }

    .table-w-full-mobile {
        width: 100%;
    }

    
    

    .mobile-center {
        text-align: center;
    }

    .mobile-center > table {
        display: inline-block;
        vertical-align: inherit;
    }

    .mobile-left {
        text-align: left;
    }

    .mobile-left > table {
        display: inline-block;
        vertical-align: inherit;
    }

    .mobile-right {
        text-align: right;
    }

    .mobile-right > table {
        display: inline-block;
        vertical-align: inherit;
    }

}

</style>
</head>

<body width="100%" style="background-color:#ffffff;margin:0;padding:0!important;mso-line-height-rule:exactly;">
<div style="background-color:#ffffff">
<!--[if gte mso 9]>
                <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
                <v:fill type="tile" color="#ffffff"/>
                </v:background>
                <![endif]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td valign="top" align="center">
<table bgcolor="#ffffff" style="margin:0 auto;" align="center" id="brick_container" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container">
<tr>
<td width="600" style="min-width:600px;">
<table cellspacing="0" cellpadding="0" border="0">
<td width="600" style="border-radius:50px; ">
<table width="100%" border="0" cellpadding="0" cellspacing="0">
<tr>
<td width="100%">
<table width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td width="100%" align="center" style="background-color:#000000; border-radius:25px 25px 0px 0px; " bgcolor="#000000">
<table width="100%" border="0" cellpadding="0" cellspacing="0">
<tr>
<td>
<div style="line-height:39px; height:39px; font-size:39px">&#8202;</div>
</td>
</tr>
<tr>
<td align="center">
<table cellspacing="0" cellpadding="0" border="0">
<tr>
<td width="240" align="center"><img src="https://media.marka-img.com/7929a0ca/blDBFZzgrE0Sm2RcRlOWfktCeEjlba.png" width="240" border="0" style="max-width:240px; width: 100%;
         height: auto; display: block;"></td>
</tr>
</table>
</td>
</tr>
<tr>
<td>
<div style="line-height:21px; height:21px; font-size:21px">&#8202;</div>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td width="100%">
<table width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td width="100%" align="center" style="vertical-align: middle; background-color:#000000;  " bgcolor="#000000">
<table width="100%" border="0" cellpadding="0" cellspacing="0">
<tr>
<td>
<div style="line-height:17px; height:17px; font-size:17px">&#8202;</div>
</td>
</tr>
<tr>
<td style="vertical-align: middle;" align="center">
<div style="line-height:48px;text-align:center;"><span style="color:#ffffff;font-weight:900;font-family:Inter,Arial,sans-serif;font-size:28px;letter-spacing:-0.02em;line-height:48px;text-align:center;">Thank you for your interest in <br></span><span style="color:#eb0028;font-weight:900;font-family:Inter,Arial,sans-serif;font-size:28px;letter-spacing:-0.02em;line-height:48px;text-align:center;">TEDx</span><span style="color:#ffffff;font-weight:900;font-family:Inter,Arial,sans-serif;font-size:28px;letter-spacing:-0.02em;line-height:48px;text-align:center;">SIST 2025</span></div>
</td>
</tr>
<tr>
<td>
<div style="line-height:17px; height:17px; font-size:17px">&#8202;</div>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td width="100%">
<table width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td width="100%" align="center" style="background-color:#000000;   padding-left:24px; padding-right:24px;" bgcolor="#000000">
<table width="100%" border="0" cellpadding="0" cellspacing="0">
<tr>
<td width="100%" align="center" style="  padding-left:24px; padding-right:24px;">
<table width="100%" border="0" cellpadding="0" cellspacing="0">
<tr>
<td align="center">
<div style="line-height:48px;text-align:left;"><span style="color:#ffffff;font-weight:900;font-family:Inter,Arial,sans-serif;font-size:40px;letter-spacing:-0.02em;line-height:48px;text-align:left;">Dear $username,</span></div>
</td>
</tr>
<tr>
<td>
<div style="line-height:20px; height:20px; font-size:20px">&#8202;</div>
</td>
</tr>
<tr>
<td align="center">
<div style="line-height:24px;text-align:left;"><span style="color:#969696;font-family:Inter,Arial,sans-serif;font-size:15px;line-height:24px;text-align:left;">Thank you for your interest in attending </span><span style="color:#eb0028;font-family:Inter,Arial,sans-serif;font-size:15px;line-height:24px;text-align:left;">TEDx</span><span style="color:#969696;font-family:Inter,Arial,sans-serif;font-size:15px;line-height:24px;text-align:left;">SIST.<br><br>We received an overwhelming number of applications, and while we truly appreciate your enthusiasm, we regret that we are unable to offer you a spot this time.<br><br>However, you will be able to watch the event after it has been uploaded online, to checkout our previous year events, click here. We also encourage you to apply for future</span><span style="color:#eb0028;font-family:Inter,Arial,sans-serif;font-size:15px;line-height:24px;text-align:left;"> TEDx</span><span style="color:#969696;font-family:Inter,Arial,sans-serif;font-size:15px;line-height:24px;text-align:left;">SIST events.<br><br>Warm regards,<br>Murali Sai Ram<br>Licensee and Organiser<br></span><span style="color:#eb0028;font-family:Inter,Arial,sans-serif;font-size:15px;line-height:24px;text-align:left;">TEDx</span><span style="color:#969696;font-family:Inter,Arial,sans-serif;font-size:15px;line-height:24px;text-align:left;">SIST<br><a href="tel:+918939992777">Contact</a>
</span></div>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td>
<div style="line-height:26px; height:26px; font-size:26px">&#8202;</div>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td width="100%">
<table width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td width="100%" align="center" style="vertical-align: middle; background-color:#f0efef; border-radius:0px 0px 25px 25px;  padding-left:24px; padding-right:24px;" bgcolor="#f0efef">
<table width="100%" border="0" cellpadding="0" cellspacing="0">
<tr>
<td>
<div style="line-height:24px; height:24px; font-size:24px">&#8202;</div>
</td>
</tr>
<tr>
<td style="vertical-align: middle;" width="100%">
<table width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td width="100%" align="center">
<table width="100%" border="0" cellpadding="0" cellspacing="0">
<tr>
<td align="center">
<table cellspacing="0" cellpadding="0" border="0">
<tr>
<td width="220" align="center"><img src="https://media.marka-img.com/7929a0ca/zRyy4XTwadbCIvAYyh39VctFxV0LSP.png" width="220" border="0" style="max-width:220px; width: 100%;
         height: auto; display: block;"></td>
</tr>
</table>
</td>
</tr>
<tr>
<td>
<div style="line-height:5px; height:5px; font-size:5px">&#8202;</div>
</td>
</tr>
<tr>
<td align="center">
<div style="line-height:29px;text-align:center;"><span style="color:#a3a3a3;font-weight:800;font-family:Inter,Arial,sans-serif;font-size:16px;line-height:29px;text-align:center;">Ideas Change Everything.</span></div>
</td>
</tr>
<tr>
<td>
<div style="line-height:5px; height:5px; font-size:5px">&#8202;</div>
</td>
</tr>
<tr>
<td width="100%" align="center">
<table width="100%" border="0" cellpadding="0" cellspacing="0">
<tr>
<td align="center">
<div style="line-height:24px;text-align:center;"><span style="color:#a3a3a3;font-family:Open Sans,Arial,sans-serif;font-size:10px;line-height:24px;text-align:center;">Don’t Reply. This is an auto generated email from TEDxSIST.</span></div>
</td>
</tr>
<tr>
<td align="center">
<div style="line-height:13px;text-align:center;"><span style="color:#a3a3a3;font-family:Open Sans,Arial,sans-serif;font-size:10px;line-height:13px;text-align:center;">© TEDxSIST. All rights reserved.<br>If you have any questions</span></div>
</td>
</tr>
<tr>
<td align="center">
<div style="line-height:13px;text-align:center;"><span style="color:#a3a3a3;font-family:Open Sans,Arial,sans-serif;font-size:10px;line-height:13px;text-align:center;">Please contact <a style="color:#a3a3a3;text-decoration:none;" href="mailto:tedxsist@gmail.com" target="_blank">tedxsist@gmail.com</a> </span></div>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td>
<div style="line-height:19px; height:19px; font-size:19px">&#8202;</div>
</td>
</tr>
<tr>
<td align="center">
<table cellspacing="0" cellpadding="0" border="0">
<tr>
<td style="vertical-align: middle;">
<table cellspacing="0" cellpadding="0" border="0">
<tr>
<td>
<table width="100%" border="0" cellpadding="0" cellspacing="0">
<tr>
<td width="24"><a href="https://www.instagram.com/tedxsist?igsh=MWgwMGMzYXh4ZGphZQ=="><img src="https://media.marka-img.com/7929a0ca/F9MQMt5oKjxFXxSVfLasUc8h3sdtgj.png" width="24" border="0" style="min-width:24px; width:24px;
         height: auto; display: block;"></a></td>
<td style="width:16px; min-width:16px;" width="16">&#8202;</td>
<td width="24"><a href="https://www.youtube.com/@TED"><img src="https://media.marka-img.com/7929a0ca/6G1AVQYers0fE0f3BGpPv2dwknFzAv.png" width="24" border="0" style="min-width:24px; width:24px;
         height: auto; display: block;"></a></td>
<td style="width:16px; min-width:16px;" width="16">&#8202;</td>
<td align="center" style="vertical-align: middle;  ">
<table width="100%" border="0" cellpadding="0" cellspacing="0">
<tr>
<td style="vertical-align: middle;" width="24" align="center"><a href="https://www.linkedin.com/company/tedxsist1"><img src="https://media.marka-img.com/7929a0ca/Vwy7vQkGXaHJltjKm29R4rnYZMdo1U.png" width="24" border="0" style="min-width:24px; width:24px;
         height: auto; display: block;"></a></td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td>
<div style="line-height:24px; height:24px; font-size:24px">&#8202;</div>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</div>
</body>

</html>
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
  } catch (error: Error | unknown) {
    console.error('Error while sending email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { message: 'Failed to send email', error: errorMessage },
      { status: 500 }
    );
  }
};
