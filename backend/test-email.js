require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  try {
    console.log('Testing email configuration...');
    console.log('Email config:', {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS ? '***' : 'NOT SET'
    });

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Email configuration missing!');
      console.error('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
      console.error('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
      return;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      secure: false,
      tls: {
        rejectUnauthorized: false
      }
    });

    // Test connection
    console.log('Verifying transporter...');
    await transporter.verify();
    console.log('✅ Email transporter verified successfully');

    // Send test email
    const testEmail = process.env.EMAIL_USER; // Send to self for testing
    console.log('Sending test email to:', testEmail);

    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: testEmail,
      subject: 'Test Email - Scheduling System',
      text: 'This is a test email from the scheduling system. If you receive this, email configuration is working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Email</h2>
          <p>This is a test email from the scheduling system.</p>
          <p>If you receive this email, the email configuration is working correctly!</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </div>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', result.messageId);
    console.log('Response:', result.response);

  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error command:', error.command);
    console.error('Error response:', error.response);

    if (error.code === 'EAUTH') {
      console.error('\n🔧 AUTHENTICATION ERROR - Possible solutions:');
      console.error('1. Check if 2-Factor Authentication is enabled on your Gmail account');
      console.error('2. Generate a new App Password from Google Account settings');
      console.error('3. Make sure the app password is correct (no extra spaces)');
      console.error('4. Try enabling "Less secure app access" (deprecated but might work)');
    } else if (error.code === 'ECONNECTION') {
      console.error('\n🔧 CONNECTION ERROR - Possible solutions:');
      console.error('1. Check your internet connection');
      console.error('2. Gmail servers might be down');
      console.error('3. Firewall might be blocking the connection');
    }
  }
}

testEmail();
