# Secure Chat Deletion System

## Overview
This document describes the secure delete and clear-chat system implemented for the chat feature. The system ensures that only the authenticated user can delete their own messages and conversations, with proper backend authentication and optimized MongoDB queries.

## Security Features

### 1. Authentication & Authorization
- All endpoints require `authenticateToken` middleware
- All endpoints require `requireUser` middleware
- User ID validation ensures only the authenticated user can delete their data
- Participant verification prevents unauthorized access to threads

### 2. Per-User Deletion
- Messages and threads use soft deletion with `deletedByUsers` array
- Each user's deletion is tracked separately
- Other participants' messages remain visible to them
- Deleted items are filtered out per-user in queries

## Database Schema

### Message Model
```javascript
{
  _id: ObjectId,                    // messageId
  sender: ObjectId,                  // senderId (references User)
  chatRoom: ObjectId,                // References ChatRoom
  text: String,                      // content (or ciphertext for E2EE)
  messageType: String,                // 'text', 'image', 'audio', etc.
  createdAt: Date,                   // timestamp
  deletedByUsers: [{                 // Per-user deletion tracking
    userId: ObjectId,
    deletedAt: Date
  }],
  isDeleted: Boolean                 // Global soft delete flag
}
```

### ChatRoom Model
```javascript
{
  _id: ObjectId,                     // threadId
  participants: [ObjectId],          // Array of user IDs
  deletedByUsers: [{                  // Per-user deletion tracking
    userId: ObjectId,
    deletedAt: Date
  }],
  lastMessage: ObjectId,
  lastMessageAt: Date
}
```

## API Endpoints

### 1. Delete Single Conversation Thread
**Endpoint:** `DELETE /api/threads/:threadId`

**Description:** Deletes a specific conversation thread for the current user only.

**Authentication:** Required (JWT token)

**Authorization:** User must be a participant in the thread

**Request:**
```javascript
DELETE /api/threads/507f1f77bcf86cd799439011
Headers: { Authorization: 'Bearer <token>' }
```

**Response:**
```json
{
  "success": true,
  "message": "Thread deleted successfully"
}
```

**Security Checks:**
- Verifies user is authenticated
- Verifies user is a participant in the thread
- Only marks thread as deleted for the current user
- Other participants can still see the thread

### 2. Clear All Messages in a Thread
**Endpoint:** `DELETE /api/threads/:threadId/messages`

**Description:** Deletes all messages in a specific thread for the current user only.

**Authentication:** Required (JWT token)

**Authorization:** User must be a participant in the thread

**Request:**
```javascript
DELETE /api/threads/507f1f77bcf86cd799439011/messages
Headers: { Authorization: 'Bearer <token>' }
```

**Response:**
```json
{
  "success": true,
  "message": "Cleared 42 message(s) successfully",
  "deletedCount": 42
}
```

**Security Checks:**
- Verifies user is authenticated
- Verifies user is a participant in the thread
- Only marks messages as deleted for the current user
- Uses optimized MongoDB `updateMany` with `$push` operation


## Frontend Service Methods (React)

### API Service (`frontend/src/services/api.js`)

```javascript
import { threadsAPI } from './services/api';

// Delete a single conversation thread
const deleteThread = async (threadId) => {
  try {
    const response = await threadsAPI.deleteThread(threadId);
    return response.data;
  } catch (error) {
    console.error('Error deleting thread:', error);
    throw error;
  }
};

// Clear all messages in a specific thread
const clearThreadMessages = async (threadId) => {
  try {
    const response = await threadsAPI.clearThreadMessages(threadId);
    return response.data;
  } catch (error) {
    console.error('Error clearing thread messages:', error);
    throw error;
  }
};
```

## MongoDB Query Optimization

### Indexes
The following indexes are created for optimal performance:

```javascript
// Message indexes
messageSchema.index({ chatRoom: 1, createdAt: -1 });           // Fetch messages in thread
messageSchema.index({ sender: 1, createdAt: -1 });               // Find user's messages
messageSchema.index({ 'deletedByUsers.userId': 1 });              // Filter deleted messages
messageSchema.index({ isDeleted: 1, createdAt: -1 });            // Soft delete queries
messageSchema.index({ chatRoom: 1, sender: 1, createdAt: -1 });    // Composite index

// ChatRoom indexes
chatRoomSchema.index({ participants: 1 });                       // Find user's threads
chatRoomSchema.index({ 'deletedByUsers.userId': 1 });            // Filter deleted threads
```

### Optimized Queries

#### Clear Thread Messages
```javascript
Message.updateMany(
  {
    chatRoom: threadId,
    'deletedByUsers.userId': { $ne: currentUserId }  // Only not-yet-deleted messages
  },
  {
    $push: {
      deletedByUsers: {
        userId: currentUserId,
        deletedAt: new Date()
      }
    }
  }
)
```


## Security Best Practices

1. **Authentication Required:** All endpoints use `authenticateToken` middleware
2. **User Verification:** User ID is validated and converted to MongoDB ObjectId
3. **Participant Check:** Thread access is verified before any operations
4. **Per-User Deletion:** Uses `deletedByUsers` array to track per-user state
5. **No Cross-User Impact:** Deletions only affect the current user's view
6. **Optimized Queries:** Uses indexes and bulk operations for efficiency
7. **Error Handling:** Proper error responses without exposing internals

## Usage Examples

### Example 1: Delete a Conversation
```javascript
// Frontend
import { threadsAPI } from './services/api';

const handleDeleteConversation = async (threadId) => {
  try {
    await threadsAPI.deleteThread(threadId);
    // Refresh conversation list
    loadConversations();
  } catch (error) {
    showError('Failed to delete conversation');
  }
};
```

### Example 2: Clear Messages in a Thread
```javascript
// Frontend
import { threadsAPI } from './services/api';

const handleClearMessages = async (threadId) => {
  try {
    const result = await threadsAPI.clearThreadMessages(threadId);
    showSuccess(`Cleared ${result.deletedCount} messages`);
    // Refresh messages
    loadMessages(threadId);
  } catch (error) {
    showError('Failed to clear messages');
  }
};
```

### Example 2: Clear All Messages in a Thread
```javascript
// Frontend
import { threadsAPI } from './services/api';

const handleClearMessages = async (threadId) => {
  try {
    const result = await threadsAPI.clearThreadMessages(threadId);
    showSuccess(`Cleared ${result.deletedCount} messages`);
    // Refresh messages
    loadMessages(threadId);
  } catch (error) {
    showError('Failed to clear messages');
  }
};
```

## Performance Considerations

1. **Bulk Operations:** Uses `updateMany` instead of individual updates
2. **Indexed Queries:** All queries use appropriate indexes
3. **Selective Fields:** Uses `.select('_id')` when only IDs are needed
4. **Efficient Filtering:** Uses `$ne` operator to exclude already-deleted items
5. **Pagination:** Message fetching uses pagination to limit results

## Testing

### Test Cases
1. ✅ User can delete their own conversation
2. ✅ User cannot delete conversations they're not part of
3. ✅ Deleted conversations don't appear for the deleting user
4. ✅ Other participants still see the conversation
5. ✅ User can clear messages in a thread
6. ✅ Deleted messages are filtered in GET requests
8. ✅ Authentication is required for all operations
9. ✅ Invalid thread IDs return 404
10. ✅ Unauthorized access returns 403

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid user/thread ID)
- `403`: Forbidden (not a participant)
- `404`: Not Found (thread doesn't exist)
- `500`: Internal Server Error

## Future Enhancements

1. **Hard Delete:** Option to permanently delete after 30 days
2. **Selective Deletion:** Delete specific messages instead of all
3. **Recovery:** Undo deletion within 24 hours
4. **Export:** Export chat history before deletion
5. **Analytics:** Track deletion patterns for insights

