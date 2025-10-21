# ITWOS AI Frontend

React + Vite frontend with Ant Design, Redux Toolkit, and end-to-end encrypted chat functionality.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Backend server running (see backend README)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment setup**
   Create `.env` file:
   ```env
   VITE_API_URL=http://localhost:7000/api
   VITE_SOCKET_URL=http://localhost:7000
   VITE_GOOGLE_CLIENT_ID=your-google-client-id
   VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 📁 Project Structure

```
/frontend
  /src
    /components          # Reusable components
      /Common           # Common components (LoadingSpinner, etc.)
      /Layout           # Layout components (LayoutWrapper, etc.)
    /pages              # Page components
      /Auth            # Authentication pages
      /User            # User dashboard pages
      /Admin           # Admin dashboard pages
      /Products        # Product-related pages
    /store             # Redux store and slices
      /slices          # Redux slices (auth, user, products, chat, ui)
    /services          # API services and utilities
    /hooks             # Custom React hooks
    /utils             # Utility functions
  main.jsx            # React entry point
  App.jsx             # Main app component
  index.html          # HTML template
  vite.config.js      # Vite configuration
```

## 🎨 UI Components

### Layout Components
- **LayoutWrapper**: Main layout with sidebar and header
- **ProtectedRoute**: Route protection for authenticated users
- **AdminRoute**: Route protection for admin users

### Common Components
- **LoadingSpinner**: Loading indicator
- **ErrorBoundary**: Error handling component
- **Toast**: Notification system

### Form Components
- **LoginForm**: User login form
- **RegisterForm**: User registration form
- **ProfileForm**: User profile update form
- **ProductForm**: Product creation/editing form

### Chat Components
- **ChatRoom**: Chat room interface
- **MessageList**: Message display component
- **MessageInput**: Message input with E2EE
- **UserList**: Online users list

## 🔐 End-to-End Encryption (E2EE)

### Key Management
- Client-side RSA-2048 key pair generation
- Public key exchange between users
- Private key stored locally (encrypted with user password)
- Key backup and recovery options

### Message Encryption
- AES-GCM encryption for message content
- Shared secret derivation using ECDH
- Initialization vector (IV) for each message
- Server stores only ciphertext

### Implementation
```javascript
// Generate key pair
const keyPair = encryptionService.generateKeyPair()

// Encrypt message
const encrypted = encryptionService.encryptMessage(message, sharedSecret)

// Decrypt message
const decrypted = encryptionService.decryptMessage(ciphertext, sharedSecret, iv)
```

## 🗂️ Redux Store Structure

### Auth Slice
- User authentication state
- Login/logout actions
- Token management
- Google OAuth integration

### User Slice
- User profile management
- Following/followers
- Purchase history
- Public key management

### Product Slice
- Product listing and filtering
- Product details
- Search functionality
- Admin product management

### Chat Slice
- Chat rooms management
- Message handling
- Real-time updates
- E2EE message encryption

### UI Slice
- Theme management
- Sidebar state
- Modal management
- Notification system

## 🛠️ API Integration

### Authentication API
```javascript
// Login
dispatch(login({ email, password }))

// Register
dispatch(register({ name, email, password, publicKey }))

// Google OAuth
dispatch(googleLogin(tokenId))

// Logout
dispatch(logout())
```

### User API
```javascript
// Update profile
dispatch(updateProfile(profileData))

// Follow user
dispatch(followUser(userId))

// Get purchases
dispatch(getPurchases({ page, limit }))
```

### Product API
```javascript
// Get products
dispatch(getProducts({ page, limit, filters }))

// Get product details
dispatch(getProduct(productId))

// Search products
dispatch(searchProducts({ query, filters }))
```

### Chat API
```javascript
// Get chat rooms
dispatch(getChatRooms({ page, limit }))

// Send message
dispatch(sendMessage({ roomId, messageData }))

// Add reaction
dispatch(addReaction({ messageId, emoji }))
```

## 🔌 Socket.IO Integration

### Connection Setup
```javascript
import { socketService } from './services/api'

const socket = socketService.connect()

socket.on('connect', () => {
  console.log('Connected to server')
})

socket.on('new-message', (data) => {
  // Handle new message
  dispatch(addMessage(data.message))
})
```

### Real-time Events
- **new-message**: New message received
- **typing**: User typing indicator
- **stop-typing**: User stopped typing
- **user-online**: User came online
- **user-offline**: User went offline

## 💳 Payment Integration

### Razorpay Integration
```javascript
// Create order
const order = await paymentAPI.createOrder({
  productId,
  amount,
  currency: 'INR'
})

// Verify payment
const verification = await paymentAPI.verifyPayment({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature
})
```

### Payment Flow
1. User selects product
2. Create Razorpay order
3. Open Razorpay checkout
4. Handle payment success
5. Verify payment on server
6. Update purchase status

## 📱 Responsive Design

### Breakpoints
- **xs**: < 576px (mobile)
- **sm**: 576px - 768px (tablet)
- **md**: 768px - 992px (desktop)
- **lg**: 992px - 1200px (large desktop)
- **xl**: > 1200px (extra large)

### Mobile Features
- Collapsible sidebar
- Touch-friendly interface
- Swipe gestures
- Mobile-optimized chat

## 🎨 Theme System

### Light/Dark Mode
```javascript
// Toggle theme
dispatch(toggleTheme())

// Set specific theme
dispatch(setTheme('dark'))
```

### Custom Styling
- CSS variables for colors
- Ant Design theme customization
- Responsive design utilities
- Custom component styles

## 🧪 Testing

### Component Testing
```bash
npm run test
```

### Test Structure
- Unit tests for components
- Integration tests for API calls
- E2E tests for user flows
- E2EE encryption tests

## 🚀 Deployment

### Build Configuration
```bash
npm run build
```

### Environment Variables
```env
VITE_API_URL=https://api.itwos.ai/api
VITE_SOCKET_URL=https://api.itwos.ai
VITE_GOOGLE_CLIENT_ID=your-production-client-id
VITE_CLOUDINARY_CLOUD_NAME=your-production-cloud-name
```

### Deployment Platforms
- **Vercel**: Automatic deployments from GitHub
- **Netlify**: Static site hosting with CI/CD
- **AWS S3**: Static website hosting
- **GitHub Pages**: Free static hosting

## 🔧 Development

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style
- ESLint configuration
- Prettier for formatting
- Consistent naming conventions
- Component documentation

## 📊 Performance Optimization

### Code Splitting
- Route-based code splitting
- Lazy loading for heavy components
- Dynamic imports for admin features

### Caching
- Redux state persistence
- API response caching
- Image optimization with Cloudinary

### Bundle Optimization
- Tree shaking for unused code
- Minification and compression
- Asset optimization

## 🔒 Security Best Practices

### Client-side Security
- No sensitive data in localStorage
- Secure token handling
- XSS prevention
- CSRF protection

### E2EE Implementation
- Secure key generation
- Proper encryption algorithms
- Key rotation support
- Forward secrecy

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
