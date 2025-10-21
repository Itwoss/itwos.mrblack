const Notification = require('../models/Notification')
const User = require('../models/User')
const { sendNotificationEmail } = require('./mailjet')

class NotificationService {
  // Create notification for user
  static async createUserNotification(userId, type, title, message, data = {}, priority = 'normal') {
    try {
      const notification = new Notification({
        userId,
        type,
        title,
        message,
        data,
        priority
      })
      
      await notification.save()
      
      // Send email notification for important events
      if (['payment_success', 'prebook_confirmed', 'prebook_rejected'].includes(type)) {
        const user = await User.findById(userId)
        if (user && user.email) {
          await this.sendEmailNotification(user.email, user.name, title, message, type)
        }
      }
      
      return notification
    } catch (error) {
      console.error('Error creating user notification:', error)
      throw error
    }
  }

  // Create notification for all admins
  static async createAdminNotification(type, title, message, data = {}, priority = 'normal') {
    try {
      const adminUsers = await User.find({ 
        role: { $in: ['admin', 'superadmin'] } 
      })
      
      const notifications = []
      
      for (const admin of adminUsers) {
        const notification = new Notification({
          userId: admin._id,
          type,
          title,
          message,
          data,
          priority
        })
        
        await notification.save()
        notifications.push(notification)
      }
      
      return notifications
    } catch (error) {
      console.error('Error creating admin notification:', error)
      throw error
    }
  }

  // Create prebook payment notification
  static async createPrebookPaymentNotification(prebook, product, user) {
    try {
      // User notification (only if user exists)
      if (user && user._id) {
        const userNotification = await this.createUserNotification(
          user._id,
          'payment_success',
          'Payment Successful! 🎉',
          `Your payment for "${product.title}" has been processed successfully. Your prebook request is now under review.`,
          {
            prebookId: prebook._id,
            productId: product._id,
            paymentId: prebook.paymentId,
            amount: prebook.paymentAmount
          },
          'high'
        )
      }

      // Admin notification
      const requesterName = user?.name || prebook.contactInfo?.name || 'Guest User'
      const requesterEmail = user?.email || prebook.contactInfo?.email || 'No email'
      const requesterId = user?._id || prebook._id

      const adminNotifications = await this.createAdminNotification(
        'prebook_payment',
        'New Paid Prebook Request 💰',
        `New prebook request with payment for "${product.title}" from ${requesterName} (${requesterEmail})`,
        {
          prebookId: prebook._id,
          productId: product._id,
          requesterId: requesterId,
          requesterName: requesterName,
          requesterEmail: requesterEmail,
          paymentId: prebook.paymentId,
          amount: prebook.paymentAmount,
          productTitle: product.title
        },
        'high'
      )

      return { userNotification, adminNotifications }
    } catch (error) {
      console.error('Error creating prebook payment notification:', error)
      throw error
    }
  }

  // Create prebook status update notification
  static async createPrebookStatusNotification(prebook, product, user, status, adminName) {
    try {
      let title, message, notificationType

      switch (status) {
        case 'accepted':
          title = 'Prebook Confirmed! ✅'
          message = `Great news! Your prebook request for "${product.title}" has been approved and confirmed.`
          notificationType = 'prebook_confirmed'
          break
        case 'rejected':
          title = 'Prebook Request Update'
          message = `Your prebook request for "${product.title}" has been reviewed but was not approved at this time.`
          notificationType = 'prebook_rejected'
          break
        default:
          title = 'Prebook Status Update'
          message = `Your prebook request for "${product.title}" status has been updated to ${status}.`
          notificationType = 'prebook_status_update'
      }

      const userNotification = await this.createUserNotification(
        user._id,
        notificationType,
        title,
        message,
        {
          prebookId: prebook._id,
          productId: product._id,
          status,
          adminName
        },
        status === 'accepted' ? 'high' : 'normal'
      )

      return userNotification
    } catch (error) {
      console.error('Error creating prebook status notification:', error)
      throw error
    }
  }

  // Send email notification
  static async sendEmailNotification(email, name, title, message, type) {
    try {
      const emailData = {
        to: email,
        subject: title,
        template: this.getEmailTemplate(type),
        variables: {
          name,
          title,
          message,
          type
        }
      }

      await sendNotificationEmail(emailData)
    } catch (error) {
      console.error('Error sending email notification:', error)
      // Don't throw error to avoid breaking the main flow
    }
  }

  // Get email template based on notification type
  static getEmailTemplate(type) {
    const templates = {
      'payment_success': 'payment-success',
      'prebook_confirmed': 'prebook-confirmed',
      'prebook_rejected': 'prebook-rejected',
      'prebook_status_update': 'prebook-status-update'
    }
    
    return templates[type] || 'general-notification'
  }

  // Get notifications for user
  static async getUserNotifications(userId, limit = 20, skip = 0) {
    try {
      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('userId', 'name email')

      const total = await Notification.countDocuments({ userId })
      const unreadCount = await Notification.countDocuments({ userId, read: false })

      return {
        notifications,
        total,
        unreadCount
      }
    } catch (error) {
      console.error('Error getting user notifications:', error)
      throw error
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        userId
      })

      if (!notification) {
        throw new Error('Notification not found')
      }

      await notification.markAsRead()
      return notification
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  // Mark all notifications as read for user
  static async markAllAsRead(userId) {
    try {
      await Notification.updateMany(
        { userId, read: false },
        { 
          read: true, 
          readAt: new Date() 
        }
      )
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  // Get notification statistics
  static async getNotificationStats(userId) {
    try {
      const stats = await Notification.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            unread: {
              $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] }
            },
            byType: {
              $push: {
                type: '$type',
                read: '$read'
              }
            }
          }
        }
      ])

      return stats[0] || { total: 0, unread: 0, byType: [] }
    } catch (error) {
      console.error('Error getting notification stats:', error)
      throw error
    }
  }
}

module.exports = NotificationService