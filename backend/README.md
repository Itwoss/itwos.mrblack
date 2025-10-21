# ITWOS AI Backend

Node.js + Express backend with MongoDB, JWT authentication, Socket.IO, Razorpay payments, Mailjet emails, and Cloudinary uploads.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Razorpay account
- Mailjet account
- Cloudinary account

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment setup**
   ```bash
   cp env.example .env
   ```
   
   Update `.env` with your configuration (see Environment Variables section)

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Start production server**
   ```bash
   npm start
   ```

## 🔧 Environment Variables

Create a `.env` file in the backend root directory:

```env
# Server Configuration
PORT=7000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/itwos-ai
# For production: mongodb+srv://username:password@cluster.mongodb.net/itwos-ai

# JWT Secrets (generate strong secrets)
JWT_ACCESS_SECRET=your-super-secret-access-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Razorpay Configuration
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_SECRET=your-razorpay-secret

# Mailjet Configuration
MAILJET_API_KEY=your-mailjet-api-key
MAILJET_API_SECRET=your-mailjet-api-secret

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Frontend/Backend URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:7000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

## 📁 Project Structure

```
/backend
  /src
    /controllers     # Route controllers (if using MVC pattern)
    /models          # Mongoose models
    /routes          # API routes
    /services        # External service integrations
    /utils           # Utility functions
    /middleware      # Custom middleware
  app.js            # Express app configuration
  server.js         # Server entry point
  package.json      # Dependencies and scripts
```

## 🗄️ Database Models

### User Model
- **Fields**: name, email, passwordHash, avatarUrl, phone, role, googleId, bio, following, purchases, publicKey, isEmailVerified
- **Indexes**: email (unique), googleId (sparse), role, createdAt
- **Methods**: comparePassword, getPublicProfile, getFullProfile

### Product Model
- **Fields**: type, title, slug, description, price, currency, images, contentUrl, author, published, featured, tags, category
- **Indexes**: slug (unique), type, author, published, featured, category, price, createdAt
- **Methods**: getPublicData, findPublished, findByCategory, search

### Purchase Model
- **Fields**: buyer, product, razorpayOrderId, razorpayPaymentId, amount, currency, status, paymentMethod, billingAddress
- **Indexes**: buyer, product, razorpayOrderId (unique), status, createdAt
- **Methods**: getPublicData, getFullData, getSalesSummary, getSalesByProduct

### ChatRoom Model
- **Fields**: participants, isGroup, name, description, avatar, lastMessageAt, metadata, isActive, createdBy, admins
- **Indexes**: participants, isGroup, lastMessageAt, isActive, createdBy
- **Methods**: addParticipant, removeParticipant, isParticipant, isAdmin, getPublicData, getFullData

### Message Model (E2EE)
- **Fields**: chatRoom, sender, ciphertext, iv, messageType, status, reactions, replyTo, isEdited, isDeleted
- **Indexes**: chatRoom + createdAt, sender, status, isDeleted, isModerated
- **Methods**: addReaction, removeReaction, markAsRead, softDelete, getPublicData, getMetadata

## 🔐 Security Features

### End-to-End Encryption (E2EE)
- Client-side key generation using RSA-2048 or Ed25519
- Shared secret derivation using ECDH
- AES-GCM encryption for message content
- Server stores only ciphertext and metadata
- Admin moderation limited to metadata only

### Authentication & Authorization
- JWT access tokens (15 minutes expiry)
- HTTP-only refresh tokens (7 days expiry)
- Password hashing with bcrypt (12 rounds)
- Google OAuth integration
- Role-based access control (user/admin)

### Payment Security
- Razorpay hosted checkout (PCI DSS compliant)
- Server-side payment verification
- No card data storage on server
- Secure webhook handling

## 🛠️ API Routes

### Authentication Routes (`/api/auth`)
- `POST /register` - User registration with E2EE public key
- `POST /login` - User login
- `POST /google` - Google OAuth login
- `POST /refresh` - Refresh access token
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password
- `POST /verify-email` - Verify email address
- `POST /resend-verification` - Resend verification email
- `POST /logout` - User logout
- `GET /me` - Get current user

### User Routes (`/api/users`)
- `GET /me` - Get current user profile
- `PUT /me` - Update user profile
- `GET /:id` - Get user by ID (public profile)
- `POST /:id/follow` - Follow user
- `DELETE /:id/follow` - Unfollow user
- `GET /:id/following` - Get user's following list
- `GET /:id/followers` - Get user's followers
- `GET /:id/purchases` - Get user's purchases
- `PUT /me/public-key` - Update E2EE public key
- `GET /search` - Search users
- `GET /:id/stats` - Get user statistics
- `DELETE /me` - Delete user account

### Product Routes (`/api/products`)
- `GET /` - Get all products (with filters)
- `GET /featured` - Get featured products
- `GET /slug/:slug` - Get product by slug
- `GET /:id` - Get product by ID
- `POST /` - Create product (admin only)
- `PUT /:id` - Update product (admin only)
- `DELETE /:id` - Delete product (admin only)
- `GET /categories/list` - Get product categories
- `GET /category/:category` - Get products by category
- `GET /author/:authorId` - Get products by author
- `PATCH /:id/featured` - Toggle featured status (admin)
- `PATCH /:id/published` - Toggle published status (admin)

### Payment Routes (`/api/payments`)
- `POST /create-order` - Create Razorpay order
- `POST /verify` - Verify payment signature
- `GET /my-purchases` - Get user's purchases
- `GET /:id` - Get purchase by ID
- `POST /:id/refund` - Process refund (admin)
- `GET /admin/statistics` - Get sales statistics (admin)
- `GET /admin/purchases` - Get all purchases (admin)

### Chat Routes (`/api/chat`)
- `POST /rooms` - Create chat room
- `GET /rooms` - Get user's chat rooms
- `GET /rooms/:id` - Get chat room by ID
- `PUT /rooms/:id` - Update chat room
- `POST /rooms/:id/participants` - Add participant
- `DELETE /rooms/:id/participants/:userId` - Remove participant
- `GET /rooms/:id/messages` - Get messages for room
- `POST /rooms/:id/messages` - Send message (E2EE)
- `POST /messages/:id/reactions` - Add reaction
- `DELETE /messages/:id/reactions` - Remove reaction
- `DELETE /messages/:id` - Delete message
- `PATCH /rooms/:id/read` - Mark messages as read
- `GET /unread-count` - Get unread message count

### Admin Routes (`/api/admin`)
- `GET /dashboard` - Get admin dashboard statistics
- `GET /users` - Get all users (admin)
- `GET /users/:id` - Get user details (admin)
- `PATCH /users/:id/role` - Update user role (admin)
- `DELETE /users/:id` - Delete user (admin)
- `GET /products` - Get all products (admin)
- `GET /analytics/sales` - Get sales analytics (admin)
- `GET /chat/moderation` - Get chat moderation data (admin)
- `POST /chat/messages/:id/flag` - Flag message for moderation (admin)
- `POST /notifications/send` - Send notifications (admin)
- `GET /settings` - Get system settings (admin)

## 🔌 Socket.IO Events

### Client to Server
- `join-room` - Join a chat room
- `leave-room` - Leave a chat room
- `join-user` - Join user session
- `typing` - User is typing
- `stop-typing` - User stopped typing
- `new-message` - Send new message

### Server to Client
- `new-message` - New message received
- `typing` - User typing indicator
- `stop-typing` - User stopped typing
- `user-online` - User came online
- `user-offline` - User went offline
- `message-delivered` - Message delivered
- `message-read` - Message read

## 📧 Email Templates

### Welcome Email
- Sent after successful registration
- Includes platform features and getting started guide

### Payment Confirmation
- Sent after successful payment
- Includes purchase details and receipt

### Password Reset
- Sent when user requests password reset
- Includes secure reset link (1 hour expiry)

### Course Enrollment
- Sent after course purchase
- Includes course details and access instructions

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Test Files
- `tests/auth.test.js` - Authentication tests
- `tests/payments.test.js` - Payment processing tests
- `tests/chat.test.js` - Chat functionality tests
- `tests/admin.test.js` - Admin functionality tests

## 🚀 Deployment

### Environment Setup
1. Set all environment variables in production
2. Ensure MongoDB Atlas connection
3. Configure CORS for production domain
4. Set up SSL/TLS certificates

### Deployment Platforms
- **Railway**: Easy deployment with automatic builds
- **Render**: Free tier available with automatic deployments
- **DigitalOcean**: App Platform for containerized deployment
- **Heroku**: Traditional PaaS deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] MongoDB Atlas cluster set up
- [ ] Razorpay production keys configured
- [ ] Mailjet production settings
- [ ] Cloudinary production settings
- [ ] CORS configured for frontend domain
- [ ] SSL/TLS certificates installed
- [ ] Health check endpoint working
- [ ] Socket.IO working over HTTPS/WSS

## 📊 Monitoring & Logging

### Health Check
- `GET /api/health` - Server health status
- Returns uptime, timestamp, and status

### Error Handling
- Global error handler middleware
- Detailed error logging in development
- Sanitized error responses in production

### Performance Monitoring
- Request/response time logging
- Database query optimization
- Memory usage monitoring

## 🔧 Development

### Scripts
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

### Code Style
- ESLint configuration included
- Prettier for code formatting
- Consistent naming conventions
- JSDoc comments for functions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
