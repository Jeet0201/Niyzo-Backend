/**
 * EMAIL SERVICE
 * Production-ready email sending for mentor answers
 * 
 * Supports:
 *   - Development: Console logging only (no email sent)
 *   - Production: Nodemailer with SMTP or SendGrid
 * 
 * Environment variables:
 *   EMAIL_PROVIDER: 'console', 'nodemailer', 'sendgrid'
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
 *   SENDGRID_API_KEY
 *   EMAIL_FROM: Sender email address
 * 
 * Usage:
 *   const { sendAnswerEmail } = require('./emailService');
 *   await sendAnswerEmail({
 *     studentEmail: 'student@example.com',
 *     studentName: 'John',
 *     mentorName: 'Dr. Sarah',
 *     subject: 'JavaScript',
 *     question: 'How do closures work?',
 *     answer: 'Closures are...',
 *     mentorSubject: 'Computer Science'
 *   });
 */

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'console';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@youthsolve.com';

let nodemailer = null;
let sgMail = null;

// Initialize email providers based on environment
if (EMAIL_PROVIDER === 'nodemailer') {
  try {
    nodemailer = require('nodemailer');
  } catch (e) {
    console.warn('Nodemailer not installed. Email sending will not work.');
  }
}

if (EMAIL_PROVIDER === 'sendgrid') {
  try {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  } catch (e) {
    console.warn('SendGrid not installed. Email sending will not work.');
  }
}

/**
 * Build HTML email template for mentor answer
 */
function buildEmailTemplate(data) {
  const {
    studentName,
    mentorName,
    subject,
    question,
    answer,
    mentorSubject
  } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .question-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .answer-box { background: white; border-left: 4px solid #48bb78; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; margin-top: 20px; }
    h2 { color: #667eea; }
    .mentor-info { background: #f0f4ff; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .subject-tag { display: inline-block; background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 Your Question Has Been Answered!</h1>
      <p>Hi ${studentName},</p>
    </div>
    <div class="content">
      <p>${mentorName} has answered your question on <strong>${subject}</strong>.</p>
      
      <div class="mentor-info">
        <strong>💡 Mentor:</strong> ${mentorName}<br>
        <span class="subject-tag">${mentorSubject}</span>
      </div>

      <h3>Your Question:</h3>
      <div class="question-box">
        <p><strong>Subject:</strong> ${subject}</p>
        <p>${question}</p>
      </div>

      <h3>Answer:</h3>
      <div class="answer-box">
        <p>${answer.replace(/\n/g, '<br>')}</p>
      </div>

      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        <strong>Need more clarification?</strong><br>
        Log in to your YouthSolve account to ask follow-up questions or message ${mentorName} directly.
      </p>

      <div class="footer">
        <p>© 2026 YouthSolve. All rights reserved.</p>
        <p>This is an automated email. Please do not reply to this address.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send mentor answer email via configured provider
 * @param {Object} data
 * @param {string} data.studentEmail - Student's email address
 * @param {string} data.studentName - Student's name
 * @param {string} data.mentorName - Mentor's name
 * @param {string} data.subject - Subject of the question
 * @param {string} data.question - Original question text
 * @param {string} data.answer - Mentor's answer
 * @param {string} data.mentorSubject - Mentor's subject expertise
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendAnswerEmail(data) {
  try {
    const {
      studentEmail,
      studentName,
      mentorName,
      subject,
      question,
      answer,
      mentorSubject
    } = data;

    // Validate inputs
    if (!studentEmail || !studentName || !mentorName || !subject || !answer) {
      return {
        success: false,
        message: 'Missing required email data'
      };
    }

    const htmlContent = buildEmailTemplate(data);
    const emailSubject = `Answer from ${mentorName} to your "${subject}" question`;

    // Development: Console logging only
    if (EMAIL_PROVIDER === 'console') {
      console.log('📧 [EMAIL SERVICE - DEVELOPMENT MODE]');
      console.log(`To: ${studentEmail}`);
      console.log(`From: ${EMAIL_FROM}`);
      console.log(`Subject: ${emailSubject}`);
      console.log(`Student: ${studentName}`);
      console.log(`---`);
      console.log(htmlContent.substring(0, 200) + '...');
      console.log('---');
      return {
        success: true,
        message: 'Email logged (development mode)'
      };
    }

    // Production: Send via configured provider
    if (EMAIL_PROVIDER === 'sendgrid' && sgMail) {
      await sgMail.send({
        to: studentEmail,
        from: EMAIL_FROM,
        subject: emailSubject,
        html: htmlContent,
        replyTo: 'support@youthsolve.com'
      });
      return {
        success: true,
        message: 'Email sent via SendGrid'
      };
    }

    if (EMAIL_PROVIDER === 'nodemailer' && nodemailer) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });

      await transporter.sendMail({
        to: studentEmail,
        from: EMAIL_FROM,
        subject: emailSubject,
        html: htmlContent,
        replyTo: 'support@youthsolve.com'
      });

      return {
        success: true,
        message: 'Email sent via SMTP'
      };
    }

    // Fallback: Log warning
    console.warn(`⚠️ Email provider '${EMAIL_PROVIDER}' not configured. Email not sent.`);
    return {
      success: false,
      message: `Email provider ${EMAIL_PROVIDER} not available`
    };
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return {
      success: false,
      message: `Email sending failed: ${error.message}`
    };
  }
}

module.exports = {
  sendAnswerEmail
};
