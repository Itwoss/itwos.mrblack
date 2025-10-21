const axios = require('axios');

// Send welcome email
const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const response = await axios.post('https://api.mailjet.com/v3.1/send', {
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_FROM_EMAIL || 'noreply@itwos.ai',
            Name: 'ITWOS AI'
          },
          To: [
            {
              Email: userEmail,
              Name: userName
            }
          ],
          Subject: 'Welcome to ITWOS AI!',
          TextPart: `Hello ${userName}, welcome to ITWOS AI! We're excited to have you on board.`,
          HTMLPart: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Welcome to ITWOS AI!</h2>
              <p>Hello ${userName},</p>
              <p>Welcome to ITWOS AI! We're excited to have you on board.</p>
              <p>You can now:</p>
              <ul>
                <li>Browse our products and courses</li>
                <li>Make secure payments with Razorpay</li>
                <li>Chat with our team using end-to-end encryption</li>
                <li>Join live sessions and webinars</li>
              </ul>
              <p>If you have any questions, feel free to reach out to us.</p>
              <p>Best regards,<br>The ITWOS AI Team</p>
            </div>
          `
        }
      ]
    }, {
      auth: {
        username: process.env.MAILJET_API_KEY,
        password: process.env.MAILJET_API_SECRET
      }
    });

    return {
      success: true,
      messageId: response.data.Messages[0].To[0].MessageID
    };
  } catch (error) {
    console.error('Welcome email error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send welcome email'
    };
  }
};

// Send payment confirmation email
const sendPaymentConfirmationEmail = async (userEmail, userName, purchaseDetails) => {
  try {
    const response = await axios.post('https://api.mailjet.com/v3.1/send', {
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_FROM_EMAIL || 'noreply@itwos.ai',
            Name: 'ITWOS AI'
          },
          To: [
            {
              Email: userEmail,
              Name: userName
            }
          ],
          Subject: 'Payment Confirmation - ITWOS AI',
          TextPart: `Hello ${userName}, your payment of ${purchaseDetails.amount} ${purchaseDetails.currency} has been confirmed.`,
          HTMLPart: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Payment Confirmation</h2>
              <p>Hello ${userName},</p>
              <p>Your payment has been successfully processed!</p>
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3>Purchase Details:</h3>
                <p><strong>Product:</strong> ${purchaseDetails.productTitle}</p>
                <p><strong>Amount:</strong> ${purchaseDetails.amount} ${purchaseDetails.currency}</p>
                <p><strong>Order ID:</strong> ${purchaseDetails.orderId}</p>
                <p><strong>Payment ID:</strong> ${purchaseDetails.paymentId}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <p>You can access your purchase in your dashboard.</p>
              <p>Thank you for your business!</p>
              <p>Best regards,<br>The ITWOS AI Team</p>
            </div>
          `
        }
      ]
    }, {
      auth: {
        username: process.env.MAILJET_API_KEY,
        password: process.env.MAILJET_API_SECRET
      }
    });

    return {
      success: true,
      messageId: response.data.Messages[0].To[0].MessageID
    };
  } catch (error) {
    console.error('Payment confirmation email error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send payment confirmation email'
    };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (userEmail, userName, resetToken) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const response = await axios.post('https://api.mailjet.com/v3.1/send', {
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_FROM_EMAIL || 'noreply@itwos.ai',
            Name: 'ITWOS AI'
          },
          To: [
            {
              Email: userEmail,
              Name: userName
            }
          ],
          Subject: 'Password Reset - ITWOS AI',
          TextPart: `Hello ${userName}, click the link to reset your password: ${resetUrl}`,
          HTMLPart: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Password Reset Request</h2>
              <p>Hello ${userName},</p>
              <p>You requested to reset your password. Click the button below to reset it:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
              </div>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${resetUrl}</p>
              <p><strong>Note:</strong> This link will expire in 1 hour for security reasons.</p>
              <p>If you didn't request this password reset, please ignore this email.</p>
              <p>Best regards,<br>The ITWOS AI Team</p>
            </div>
          `
        }
      ]
    }, {
      auth: {
        username: process.env.MAILJET_API_KEY,
        password: process.env.MAILJET_API_SECRET
      }
    });

    return {
      success: true,
      messageId: response.data.Messages[0].To[0].MessageID
    };
  } catch (error) {
    console.error('Password reset email error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send password reset email'
    };
  }
};

// Send course enrollment email
const sendCourseEnrollmentEmail = async (userEmail, userName, courseDetails) => {
  try {
    const response = await axios.post('https://api.mailjet.com/v3.1/send', {
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_FROM_EMAIL || 'noreply@itwos.ai',
            Name: 'ITWOS AI'
          },
          To: [
            {
              Email: userEmail,
              Name: userName
            }
          ],
          Subject: 'Course Enrollment Confirmation - ITWOS AI',
          TextPart: `Hello ${userName}, you have been enrolled in ${courseDetails.title}.`,
          HTMLPart: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Course Enrollment Confirmation</h2>
              <p>Hello ${userName},</p>
              <p>Congratulations! You have been successfully enrolled in:</p>
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3>${courseDetails.title}</h3>
                <p><strong>Description:</strong> ${courseDetails.description}</p>
                <p><strong>Duration:</strong> ${courseDetails.duration} minutes</p>
                <p><strong>Difficulty:</strong> ${courseDetails.difficulty}</p>
                ${courseDetails.prerequisites ? `<p><strong>Prerequisites:</strong> ${courseDetails.prerequisites.join(', ')}</p>` : ''}
              </div>
              <p>You can access your course materials in your dashboard.</p>
              <p>Good luck with your learning journey!</p>
              <p>Best regards,<br>The ITWOS AI Team</p>
            </div>
          `
        }
      ]
    }, {
      auth: {
        username: process.env.MAILJET_API_KEY,
        password: process.env.MAILJET_API_SECRET
      }
    });

    return {
      success: true,
      messageId: response.data.Messages[0].To[0].MessageID
    };
  } catch (error) {
    console.error('Course enrollment email error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send course enrollment email'
    };
  }
};

// Send notification email
const sendNotificationEmail = async (userEmail, userName, notification) => {
  try {
    const response = await axios.post('https://api.mailjet.com/v3.1/send', {
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_FROM_EMAIL || 'noreply@itwos.ai',
            Name: 'ITWOS AI'
          },
          To: [
            {
              Email: userEmail,
              Name: userName
            }
          ],
          Subject: notification.subject || 'Notification - ITWOS AI',
          TextPart: `Hello ${userName}, ${notification.message}`,
          HTMLPart: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">${notification.subject || 'Notification'}</h2>
              <p>Hello ${userName},</p>
              <p>${notification.message}</p>
              ${notification.actionUrl ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${notification.actionUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">${notification.actionText || 'Take Action'}</a>
                </div>
              ` : ''}
              <p>Best regards,<br>The ITWOS AI Team</p>
            </div>
          `
        }
      ]
    }, {
      auth: {
        username: process.env.MAILJET_API_KEY,
        password: process.env.MAILJET_API_SECRET
      }
    });

    return {
      success: true,
      messageId: response.data.Messages[0].To[0].MessageID
    };
  } catch (error) {
    console.error('Notification email error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send notification email'
    };
  }
};

// Send bulk emails
const sendBulkEmails = async (recipients, subject, message, htmlMessage) => {
  try {
    const messages = recipients.map(recipient => ({
      From: {
        Email: process.env.MAILJET_FROM_EMAIL || 'noreply@itwos.ai',
        Name: 'ITWOS AI'
      },
      To: [
        {
          Email: recipient.email,
          Name: recipient.name
        }
      ],
      Subject: subject,
      TextPart: message,
      HTMLPart: htmlMessage
    }));

    const response = await axios.post('https://api.mailjet.com/v3.1/send', {
      Messages: messages
    });

    return {
      success: true,
      messageIds: response.data.Messages.map(msg => msg.To[0].MessageID)
    };
  } catch (error) {
    console.error('Bulk email error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send bulk emails'
    };
  }
};

// Send prebook request notification to user
const sendPrebookConfirmationEmail = async (userEmail, userName, productTitle) => {
  try {
    // Check if Mailjet is configured
    if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_API_SECRET) {
      console.log('⚠️ Mailjet not configured, skipping email notification')
      console.log('📧 Would send email to:', userEmail)
      console.log('📧 Email content:', {
        subject: `Prebook Request Confirmation - ${productTitle}`,
        from: 'ITWOS AI',
        to: userEmail,
        product: productTitle
      })
      return { success: true, message: 'Email notification logged (Mailjet not configured)' }
    }

    const response = await axios.post('https://api.mailjet.com/v3.1/send', {
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_FROM_EMAIL || 'noreply@itwos.ai',
            Name: 'ITWOS AI'
          },
          To: [
            {
              Email: userEmail,
              Name: userName
            }
          ],
          Subject: 'Prebook Request Confirmation - ITWOS AI',
          TextPart: `Hello ${userName}, your prebook request for "${productTitle}" has been received. We'll get back to you soon!`,
          HTMLPart: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Prebook Request Confirmation</h2>
              <p>Hello ${userName},</p>
              <p>Thank you for your interest in <strong>${productTitle}</strong>!</p>
              <p>Your prebook request has been received and our team will review it shortly. We'll get back to you within 24 hours.</p>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">What happens next?</h3>
                <ul style="color: #666;">
                  <li>Our team will review your requirements</li>
                  <li>We'll contact you to discuss the project details</li>
                  <li>We'll provide a detailed proposal and timeline</li>
                </ul>
              </div>
              <p>If you have any questions, feel free to contact us.</p>
              <p>Best regards,<br>ITWOS AI Team</p>
            </div>
          `
        }
      ]
    }, {
      auth: {
        username: process.env.MAILJET_API_KEY,
        password: process.env.MAILJET_API_SECRET
      }
    })
    
    console.log('✅ Prebook confirmation email sent successfully')
    return { success: true, messageId: response.data.Messages[0].To[0].MessageID }
  } catch (error) {
    console.error('❌ Error sending prebook confirmation email:', error.response?.data || error.message)
    throw error
  }
}

// Send prebook request notification to admin
const sendPrebookAdminNotificationEmail = async (adminEmail, userName, userEmail, productTitle, prebookDetails) => {
  try {
    // Check if Mailjet is configured
    if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_API_SECRET) {
      console.log('⚠️ Mailjet not configured, skipping email notification')
      console.log('📧 Would send email to:', adminEmail)
      console.log('📧 Email content:', {
        subject: `New Prebook Request - ${productTitle}`,
        from: 'Test User',
        to: adminEmail,
        product: productTitle,
        details: prebookDetails
      })
      return { success: true, message: 'Email notification logged (Mailjet not configured)' }
    }

    const response = await axios.post('https://api.mailjet.com/v3.1/send', {
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_FROM_EMAIL || 'noreply@itwos.ai',
            Name: 'ITWOS AI'
          },
          To: [
            {
              Email: adminEmail,
              Name: 'Admin'
            }
          ],
          Subject: `New Prebook Request - ${productTitle}`,
          TextPart: `New prebook request from ${userName} (${userEmail}) for "${productTitle}". Check the admin dashboard for details.`,
          HTMLPart: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">New Prebook Request</h2>
              <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1976d2; margin-top: 0;">Request Details</h3>
                <p><strong>Product:</strong> ${productTitle}</p>
                <p><strong>Customer:</strong> ${userName} (${userEmail})</p>
                <p><strong>Project Type:</strong> ${prebookDetails.projectType}</p>
                <p><strong>Budget:</strong> $${prebookDetails.budget}</p>
                <p><strong>Timeline:</strong> ${prebookDetails.timeline} days</p>
                ${prebookDetails.features && prebookDetails.features.length > 0 ? `
                  <p><strong>Features:</strong> ${prebookDetails.features.join(', ')}</p>
                ` : ''}
                ${prebookDetails.notes ? `
                  <p><strong>Notes:</strong> ${prebookDetails.notes}</p>
                ` : ''}
              </div>
              <p>Please review this request in the admin dashboard and contact the customer.</p>
              <p>Best regards,<br>ITWOS AI System</p>
            </div>
          `
        }
      ]
    }, {
      auth: {
        username: process.env.MAILJET_API_KEY,
        password: process.env.MAILJET_API_SECRET
      }
    })
    
    console.log('✅ Prebook admin notification email sent successfully')
    return { success: true, messageId: response.data.Messages[0].To[0].MessageID }
  } catch (error) {
    console.error('❌ Error sending prebook admin notification email:', error.response?.data || error.message)
    throw error
  }
}

module.exports = {
  sendWelcomeEmail,
  sendPaymentConfirmationEmail,
  sendPasswordResetEmail,
  sendCourseEnrollmentEmail,
  sendNotificationEmail,
  sendBulkEmails,
  sendPrebookConfirmationEmail,
  sendPrebookAdminNotificationEmail
};
