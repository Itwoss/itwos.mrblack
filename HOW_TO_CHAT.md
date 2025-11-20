# 💬 How to Chat in User Dashboard

## Quick Start Guide

### **Step 1: Access Chat**
Navigate to the chat page in your user dashboard:
- **URL**: `/user/chat` or `/chat`
- **Navigation**: Click "Chat" in the sidebar menu

### **Step 2: Start a Conversation**

#### **Option A: Start New Chat (1-on-1)**
1. Click **"New Chat"** button
2. Search for a user by name or email
3. Select the user you want to chat with
4. Click **"Start Chat"**
5. A thread will be created automatically

#### **Option B: Create Group Chat**
1. Click **"New Room"** button
2. Enter room name
3. Search and add multiple participants
4. Click **"Create Room"**

### **Step 3: Send Messages**

1. **Select a thread** from the left sidebar
2. **Type your message** in the input box at the bottom
3. **Press Enter** or click **"Send"** button
4. Messages are delivered **instantly** via Socket.IO

### **Step 4: View Messages**

- Messages appear in **real-time** as they're sent
- **Unread count** badge shows on threads with new messages
- **Read receipts** show when messages are read (✓)
- Messages are **automatically marked as read** when you view them

---

## Features

### ✅ **Real-time Messaging**
- Messages appear instantly without page refresh
- Uses Socket.IO for instant delivery
- Works even if you're on another tab

### ✅ **Unread Counts**
- Badge shows number of unread messages per thread
- Updates automatically when new messages arrive
- Resets when you view the thread

### ✅ **Read Receipts**
- See when your messages are read
- Track who read what and when
- Visual indicators (✓) show read status

### ✅ **Thread Management**
- **1-on-1 chats**: Direct messages with another user
- **Group chats**: Multiple participants in one thread
- **Thread list**: All your conversations in one place

### ✅ **Message History**
- Load older messages by scrolling up
- Paginated message loading (50 messages at a time)
- Full conversation history preserved

---

## API Endpoints Used

### **Create Thread**
```
POST /api/threads
Body: { memberIds: [userId1, userId2] }
```

### **List Threads**
```
GET /api/threads?userId=xyz&page=1&limit=20
```

### **Get Messages**
```
GET /api/threads/:threadId/messages?skip=0&limit=50
```

### **Send Message**
```
POST /api/threads/:threadId/messages
Body: { senderId, text, messageType: 'text' }
```

---

## Socket.IO Events

### **Client → Server**
- `join-room` - Join a thread room for real-time updates
- `send_message` - Send a message in real-time
- `mark_read` - Mark messages as read

### **Server → Client**
- `new_message` - Receive new messages instantly
- `messages_read` - Receive read receipt updates

---

## Example Usage

### **Starting a Chat**

```javascript
// 1. Find a user to chat with
GET /api/users-list?search=john

// 2. Create a thread with that user
POST /api/threads
{
  "memberIds": ["user1_id", "user2_id"]
}

// 3. Join the thread room (Socket.IO)
socket.emit('join-room', threadId)

// 4. Send a message
socket.emit('send_message', {
  threadId: "thread123",
  senderId: "user1_id",
  text: "Hello!",
  messageType: "text"
})
```

### **Receiving Messages**

```javascript
// Listen for new messages
socket.on('new_message', (data) => {
  const { threadId, message } = data
  // Update UI with new message
  addMessageToUI(message)
})
```

---

## Troubleshooting

### **Messages Not Appearing**
1. Check Socket.IO connection status
2. Verify you've joined the thread room
3. Check browser console for errors
4. Refresh the page if needed

### **Can't Create Thread**
1. Verify user IDs are valid
2. Check authentication token
3. Ensure backend is running
4. Check network connection

### **Real-time Not Working**
1. Check Socket.IO server URL in environment variables
2. Verify CORS settings
3. Check browser console for connection errors
4. Try refreshing the page

---

## Tips

💡 **Tip 1**: Use the search bar to quickly find users to chat with  
💡 **Tip 2**: Unread counts update automatically - no refresh needed  
💡 **Tip 3**: Messages are stored permanently - your chat history is safe  
💡 **Tip 4**: Group chats support multiple participants - great for team communication  
💡 **Tip 5**: Read receipts help you know when messages are seen  

---

## Next Steps

1. **Try it out**: Start a conversation with another user
2. **Explore features**: Create group chats, test real-time messaging
3. **Customize**: Add your own features using the API endpoints
4. **Integrate**: Use the chat API in other parts of your app

For more details, see `CHAT_SYSTEM_GUIDE.md`

