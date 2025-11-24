# Engagement Tracking System

## ✅ Implemented Features

### 1. Engagement Endpoints

- **POST /api/posts/:id/like** - Toggle like/unlike
- **POST /api/posts/:id/view** - Track view (increments once per user)
- **POST /api/posts/:id/save** - Toggle save/unsave (bookmark)
- **POST /api/posts/:id/share** - Track share (increments on each share)

### 2. Engagement Score Calculation

Automatic engagement score calculation using the formula:

```
engagementScore = 
  (likes × 1) + 
  (comments × 3) + 
  (saves × 4) + 
  (shares × 5) + 
  log(1 + views) × 0.1
```

**Weight Rationale:**
- Likes: 1x (basic engagement)
- Comments: 3x (higher engagement, requires more effort)
- Saves: 4x (strong interest, user wants to revisit)
- Shares: 5x (highest engagement, user promotes content)
- Views: Logarithmic (diminishing returns, prevents view manipulation)

### 3. Data Tracking

Each post tracks:
- `likes` - Count of likes
- `likedBy` - Array of user IDs who liked
- `views` - Count of unique views
- `viewedBy` - Array of user IDs who viewed
- `saves` - Count of saves
- `savedBy` - Array of user IDs who saved
- `shares` - Count of shares
- `comments` - Count of comments (to be implemented)
- `engagementScore` - Calculated score (auto-updated)

## 📝 API Usage Examples

### Like a Post
```javascript
POST /api/posts/:postId/like
Response: {
  success: true,
  message: "Post liked",
  data: {
    likes: 42,
    isLiked: true
  }
}
```

### Save a Post
```javascript
POST /api/posts/:postId/save
Response: {
  success: true,
  message: "Post saved",
  data: {
    saves: 15,
    isSaved: true
  }
}
```

### Share a Post
```javascript
POST /api/posts/:postId/share
Body: {
  platform: "whatsapp" // Optional
}
Response: {
  success: true,
  message: "Share tracked",
  data: {
    shares: 8,
    platform: "whatsapp"
  }
}
```

### Track View
```javascript
POST /api/posts/:postId/view
Response: {
  success: true,
  message: "View tracked",
  data: {
    views: 1234
  }
}
```

## 🔄 Automatic Updates

- Engagement score is automatically recalculated when:
  - Post is liked/unliked
  - Post is viewed (first time per user)
  - Post is saved/unsaved
  - Post is shared
  - Post receives a comment (when implemented)

## 📊 Next Steps

1. **Comments System** - Implement comment tracking
2. **Event Stream** - Log engagement events for analytics
3. **Trending Algorithm** - Use engagement scores with time decay
4. **Real-time Updates** - Emit engagement events via Socket.IO

## 🎯 Engagement Score Use Cases

- **Feed Ranking** - Sort posts by engagement score
- **Trending Detection** - Identify viral content
- **Creator Analytics** - Show creators their top-performing posts
- **Recommendation Engine** - Suggest high-engagement content
- **Admin Moderation** - Flag posts with suspicious engagement patterns

