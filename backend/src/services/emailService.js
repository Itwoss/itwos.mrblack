const nodemailer = require('nodemailer');

// Gmail SMTP Configuration
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password' // Use App Password, not regular password
    }
  });
};

// Send OTP via Email
const sendEmailOTP = async (email, otp) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: 'Password Reset Code - ITWOS AI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Password Reset Request</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">ITWOS AI Platform</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Your Password Reset Code</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              You requested to reset your password. Use the code below to continue:
            </p>
            
            <div style="background: #fff; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #1890ff; font-size: 36px; margin: 0; letter-spacing: 3px; font-family: 'Courier New', monospace;">${otp}</h1>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⏰ Important:</strong> This code will expire in 5 minutes for security reasons.
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you didn't request this password reset, please ignore this email. 
              Your account remains secure.
            </p>
            
            <div style="border-top: 1px solid #e9ecef; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This email was sent by ITWOS AI Platform<br>
                For support, contact us at support@itwos.ai
              </p>
            </div>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent successfully:', result.messageId);
    return { success: true, message: 'OTP sent to your email' };
    
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return { success: false, message: 'Failed to send email. Please try again.' };
  }
};

// Send SMS OTP (placeholder for future implementation)
const sendSMSOTP = async (phone, otp) => {
  try {
    // For now, just log the OTP (implement SMS service later)
    console.log(`📱 SMS OTP for ${phone}: ${otp}`);
    return { success: true, message: 'OTP sent to your phone' };
  } catch (error) {
    console.error('❌ SMS sending failed:', error);
    return { success: false, message: 'Failed to send SMS. Please try again.' };
  }
};

module.exports = {
  sendEmailOTP,
  sendSMSOTP
};
