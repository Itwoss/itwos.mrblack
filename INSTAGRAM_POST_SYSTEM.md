# Instagram-like Post System Implementation

## ✅ Completed (Phase 1 - Foundation)

### 1. Database Models
- **Post Model** (`backend/src/models/Post.js`)
  - ✅ Added `privacy` field (public/followers/private)
  - ✅ Added `status` field (uploading/processing/published/hidden/removed/blocked/moderation_pending)
  - ✅ Added `mediaKeys` array for S3/storage file keys
  - ✅ Added `cdnUrls` object (thumb/feed/detail/original)
  - ✅ Added engagement metrics: `saves`, `savedBy`, `shares`
  - ✅ Added `engagementScore` and `trendingScore`
  - ✅ Added moderation fields: `flaggedCount`, `flaggedReasons`
  - ✅ Added feature fields: `featured`, `featureStart`, `featureEnd`, `featureScope`
  - ✅ Added `processedAt` timestamp
  - ✅ Updated indexes for performance
  - ✅ Updated `getPublicData()` method to include new fields

- **Flag Model** (`backend/src/models/Flag.js`)
  - ✅ User reports and automated flags
  - ✅ Flag types: spam, nsfw, copyright, abuse, violence, hate, other
  - ✅ Severity levels and resolution tracking

- **AdminAction Model** (`backend/src/models/AdminAction.js`)
  - ✅ Tracks all admin moderation actions
  - ✅ Action types: remove, hide, feature, ban_user, warn, restore, etc.

- **AuditLog Model** (`backend/src/models/AuditLog.js`)
  - ✅ Immutable audit trail for all admin actions
  - ✅ Tracks before/after states, reasons, IP addresses

- **FeedItem Model** (`backend/src/models/FeedItem.js`)
  - ✅ Denormalized feed items for fan-out delivery
  - ✅ Supports following, explore, trending, featured sources

### 2. Admin APIs
- **Admin Posts Routes** (`backend/src/routes/adminPosts.js`)
  - ✅ `GET /api/admin/posts` - List posts with filters (flagged, status, privacy, engagement, etc.)
  - ✅ `GET /api/admin/posts/:postId` - Get detailed post info with flags and admin actions
  - ✅ `POST /api/admin/posts/:postId/moderate` - Remove, hide, or restore posts
  - ✅ `POST /api/admin/posts/:postId/feature` - Feature/unfeature posts
  - ✅ `POST /api/admin/posts/:postId/adjust-score` - Manually adjust engagement/trending scores
  - ✅ `GET /api/admin/posts/export` - Export posts to CSV
  - ✅ Automatic audit logging for all actions

## 🚧 Pending Implementation

### Phase 2 - Upload & Processing
- [ ] **Signed URL Upload** (`GET /api/uploads/signed-url`)
  - Generate presigned S3 URLs for direct client uploads
  - Support for local storage fallback during development

- [ ] **Image Processing Worker**
  - Generate variants: thumb (200x200), feed (720w), detail (1080-2048w)
  - WebP/AVIF conversion
  - EXIF stripping
  - pHash computation for duplicate detection
  - Moderation checks (NSFW, violence, copyright)

- [ ] **Update POST /api/posts**
  - Accept `privacy` parameter
  - Accept `mediaKeys` array
  - Set initial `status=processing`
  - Queue image processing job

### Phase 3 - Privacy & Feed
- [ ] **Privacy Filtering**
  - Update feed queries to respect privacy settings
  - Filter by follower relationships
  - Hide private posts from non-followers

- [ ] **Fan-Out Feed Delivery**
  - Worker to populate `feed_items` for followers
  - Batch processing for large follower lists
  - Hybrid approach for celebrity accounts

### Phase 4 - Engagement & Trending
- [ ] **Engagement Tracking**
  - Track saves and shares
  - Event stream for analytics
  - Real-time counter updates

- [ ] **Trending Algorithm**
  - Compute engagement scores with time decay
  - Update trending candidates
  - Background job for score calculation

### Phase 5 - Realtime & Notifications
- [ ] **Socket.IO Events**
  - Emit `new_post` events to followers
  - Cache invalidation on moderation actions
  - Live feed updates

- [ ] **Explore Feed**
  - Trending posts endpoint
  - Personalized recommendations
  - Featured posts integration

### Phase 6 - User Reporting
- [ ] **Flag/Report System**
  - `POST /api/posts/:postId/report` endpoint
  - User reporting UI
  - Auto-flagging based on thresholds

### Phase 7 - Admin Dashboard UI
- [ ] **Posts Browser**
  - Table with filters and search
  - Quick action buttons
  - Post preview modal

- [ ] **Moderation Queue**
  - Prioritized flagged posts
  - Review interface
  - Bulk actions

- [ ] **Analytics Dashboard**
  - Engagement trends
  - Top creators
  - Moderation metrics

## 📝 Implementation Notes

### Current Upload Flow
The existing system uses direct file uploads via Multer. To migrate to the new system:

1. **Development**: Continue using local storage with `/uploads/posts/` directory
2. **Production**: Implement S3 signed URLs and direct uploads
3. **Migration**: Existing posts will work with `status='published'` by default

### Privacy Implementation
When querying posts, add privacy checks:

```javascript
const privacyQuery = {
  $or: [
    { privacy: 'public' },
    { privacy: 'followers', userId: { $in: followingIds } },
    { privacy: 'private', userId: currentUserId }
  ]
};
```

### Engagement Score Calculation
```javascript
const engagementScore = 
  (likes * 1) + 
  (comments * 3) + 
  (saves * 4) + 
  (shares * 5) + 
  Math.log(1 + views) * 0.1;

const timeDecay = Math.exp(-0.1 * hoursSincePost);
const adjustedScore = engagementScore * timeDecay / Math.log(1 + followerCount);
```

### Next Steps
1. Update `POST /api/posts` to support new fields
2. Create image processing worker (can use Sharp library)
3. Implement privacy filtering in feed queries
4. Build admin dashboard UI components
5. Add user reporting functionality

## 🔗 Related Files

- Models: `backend/src/models/Post.js`, `Flag.js`, `AdminAction.js`, `AuditLog.js`, `FeedItem.js`
- Routes: `backend/src/routes/adminPosts.js`
- Server: `backend/server.js` (registered admin routes)

## 📚 API Examples

### Create Post (Updated)
```javascript
POST /api/posts
{
  "title": "My Post",
  "bio": "Caption here",
  "tags": ["tag1", "tag2"],
  "privacy": "public", // or "followers" or "private"
  "mediaKeys": ["/mnt/data/image.png"]
}
```

### Moderate Post
```javascript
POST /api/admin/posts/:postId/moderate
{
  "action": "remove", // or "hide" or "restore"
  "reason": "Violates community guidelines",
  "removeType": "soft", // or "hard"
  "notifyUser": true
}
```

### Feature Post
```javascript
POST /api/admin/posts/:postId/feature
{
  "feature": true,
  "start": "2025-11-25T06:00:00Z",
  "end": "2025-12-01T06:00:00Z",
  "scope": "explore" // or "home" or "category"
}
```

