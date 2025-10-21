# ITWOS AI - Vercel Deployment Guide

## 🚀 Deployment Steps

### 1. Prerequisites
- [Vercel Account](https://vercel.com) (free tier available)
- GitHub repository with your code
- Node.js 18+ installed locally

### 2. Prepare for Deployment

#### Frontend Configuration
The frontend is already configured for Vercel deployment with:
- ✅ `vercel.json` configuration
- ✅ Build scripts optimized for Vercel
- ✅ Environment variables setup
- ✅ Static build configuration

#### Environment Variables
Set these in your Vercel dashboard:

**Required Environment Variables:**
```
VITE_API_URL=https://your-backend-api.vercel.app/api
VITE_SERVER_URL=https://your-backend-api.vercel.app
NODE_ENV=production
```

### 3. Deploy to Vercel

#### Option A: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from frontend directory
cd frontend
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name: itwos-ai-frontend
# - Directory: ./
# - Override settings? No
```

#### Option B: Deploy via GitHub Integration
1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 4. Configure Environment Variables

In your Vercel project dashboard:
1. Go to Settings → Environment Variables
2. Add the following variables:

```
VITE_API_URL=https://your-backend-api.vercel.app/api
VITE_SERVER_URL=https://your-backend-api.vercel.app
NODE_ENV=production
```

### 5. Backend Deployment (Separate)

Your backend needs to be deployed separately. Options:
- **Vercel Functions** (for serverless)
- **Railway** (for full Node.js apps)
- **Render** (free tier available)
- **Heroku** (paid)

### 6. Domain Configuration

#### Custom Domain (Optional)
1. In Vercel dashboard, go to your project
2. Go to Settings → Domains
3. Add your custom domain
4. Configure DNS records as instructed

#### Default Vercel Domain
Your app will be available at:
`https://your-project-name.vercel.app`

### 7. Build Optimization

The project is optimized for Vercel with:
- ✅ Code splitting for better performance
- ✅ Asset optimization
- ✅ Caching headers
- ✅ Memory optimization for builds

### 8. Monitoring & Analytics

Vercel provides built-in:
- **Analytics**: Page views, performance metrics
- **Speed Insights**: Core Web Vitals
- **Function Logs**: Serverless function monitoring

### 9. Troubleshooting

#### Common Issues:

**Build Failures:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Environment Variables:**
- Ensure all `VITE_` prefixed variables are set
- Redeploy after adding new environment variables

**Memory Issues:**
- The build script includes memory optimization
- Vercel has 4GB memory limit for builds

### 10. Production Checklist

- [ ] Environment variables configured
- [ ] Backend API deployed and accessible
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate active
- [ ] Analytics enabled
- [ ] Performance monitoring active

## 🔧 Local Development

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📱 Features Included

- ✅ Responsive design for all devices
- ✅ Admin and user dashboards
- ✅ Notification system
- ✅ Authentication system
- ✅ Real-time updates
- ✅ Mobile optimization

## 🎯 Performance Optimizations

- **Code Splitting**: Automatic chunk splitting
- **Tree Shaking**: Unused code elimination
- **Asset Optimization**: Image and CSS optimization
- **Caching**: Proper cache headers
- **CDN**: Global content delivery

Your ITWOS AI application is now ready for Vercel deployment! 🚀
