# 💬 Chat System Architecture Guide

## Overview
The chat system is a real-time messaging platform built with **Socket.IO** for instant communication, supporting both **End-to-End Encryption (E2EE)** and plain text messages. It uses a **Thread-based** architecture where conversations are organized into threads (similar to chat rooms).

---

## 🏗️ Architecture Components

### 1. **Database Models**

#### **ChatRoom (Thread) Model**
- **Purpose**: Represents a conversation thread between users
- **Key Fields**:
  - `participants`: Array of user IDs in the thread
  - `isGroup`: Boolean (false for 1-on-1, true for group chats)
  - `lastMessageAt`: Timestamp of last message
  - `lastMessageText`: Preview text of last message (denormalized)
  - `unreadCounts`: Array tracking unread count per user
    ```javascript
    unreadCounts: [{
      userId: ObjectId,
      count: Number,
      lastReadAt: Date
    }]
    ```

#### **Message Model**
- **Purpose**: Stores individual messages
- **Key Fields**:
  - `chatRoom`: Reference to ChatRoom (thread)
  - `sender`: User ID who sent the message
  - `text`: Plain text (for preview/search)
  - `ciphertext`: Encrypted message content (E2EE)
  - `iv`: Initialization vector for encryption
  - `readBy`: Array tracking who read the message
    ```javascript
    readBy: [{
      userId: ObjectId,
      readAt: Date
    }]
    ```
  - `status`: 'sent' | 'delivered' | 'read'
  - `messageType`: 'text' | 'image' | 'file' | 'system'

---

## 🔄 How Chat Works - Step by Step

### **Phase 1: Creating a Thread**

1. **User initiates conversation**
   ```
   POST /api/threads
   Body: { memberIds: [userId1, userId2] }
   ```

2. **Backend Process**:
   - Checks if thread already exists (for 1-on-1 chats)
   - Creates new ChatRoom document
   - Initializes `unreadCounts` for all participants (set to 0)
   - Returns thread ID

3. **Response**:
   ```json
   {
     "success": true,
     "thread": {
       "_id": "thread123",
       "participants": ["user1", "user2"],
       "isGroup": false,
       "unreadCount": 0
     }
   }
   ```

---

### **Phase 2: Sending Messages**

#### **Option A: Via REST API (Fallback)**
```
POST /api/threads/:threadId/messages
Body: {
  senderId: "user1",
  text: "Hello!",
  ciphertext: "encrypted_text",  // For E2EE
  iv: "initialization_vector"
}
```

**Backend Process**:
1. Validates user has access to thread
2. Creates Message document
3. Updates thread's `lastMessageAt` and `lastMessageText`
4. Increments `unreadCount` for all participants **except sender**
5. Emits Socket.IO event `new_message` to all participants
6. Returns created message

#### **Option B: Via Socket.IO (Real-time)**
```javascript
// Client emits
socket.emit('send_message', {
  threadId: "thread123",
  senderId: "user1",
  text: "Hello!",
  ciphertext: "encrypted_text",
  iv: "iv_value"
})
```

**Backend Process** (in `server.js`):
1. Receives `send_message` event
2. Validates access
3. Creates Message document
4. Updates thread metadata
5. Increments unread counts
6. Emits `new_message` to all participants in thread room

---

### **Phase 3: Receiving Messages**

#### **Real-time (Socket.IO)**
```javascript
// Client listens
socket.on('new_message', (data) => {
  const { threadId, message } = data
  // Update UI with new message
  addMessageToUI(message)
})
```

#### **Polling (REST API)**
```
GET /api/threads/:threadId/messages?skip=0&limit=50
```

**Backend Process**:
1. Fetches messages from database
2. Automatically marks messages as read for current user
3. Resets unread count for this thread
4. Returns paginated messages

---

### **Phase 4: Read Receipts**

#### **Via Socket.IO**
```javascript
// Client emits when user views messages
socket.emit('mark_read', {
  threadId: "thread123",
  userId: "user1",
  messageIds: ["msg1", "msg2"]  // Optional: specific messages
})
```

**Backend Process**:
1. Updates `readBy` array in Message documents
2. Resets `unreadCount` for user in thread
3. Emits `messages_read` event to other participants
4. Other users see read receipts update in real-time

#### **Via REST API**
```
GET /api/threads/:threadId/messages
```
- Automatically marks all messages as read when fetched

---

## 🔌 Socket.IO Architecture

### **Connection Flow**

1. **Client connects**:
   ```javascript
   const socket = io('http://localhost:7000', {
     auth: { token: 'jwt_token', userId: 'user123' }
   })
   ```

2. **Join thread room**:
   ```javascript
   socket.emit('join-room', threadId)
   // Server adds socket to room: `io.to(threadId)`
   ```

3. **Send message**:
   ```javascript
   socket.emit('send_message', { threadId, senderId, text })
   ```

4. **Receive messages**:
   ```javascript
   socket.on('new_message', (data) => {
     // Handle new message
   })
   ```

### **Socket.IO Events**

#### **Client → Server**
- `join-room` - Join a thread room
- `leave-room` - Leave a thread room
- `send_message` - Send a message
- `mark_read` - Mark messages as read
- `ping` - Connection test

#### **Server → Client**
- `new_message` - New message received
- `messages_read` - Messages marked as read
- `message_error` - Error sending message
- `read_error` - Error marking as read
- `pong` - Response to ping

---

## 📊 Unread Count System

### **How It Works**

1. **When message is sent**:
   ```javascript
   // For each participant except sender
   thread.incrementUnread(participantId)
   // Updates: unreadCounts[participantId].count += 1
   ```

2. **When messages are read**:
   ```javascript
   thread.resetUnread(userId)
   // Updates: unreadCounts[userId].count = 0
   // Updates: unreadCounts[userId].lastReadAt = now
   ```

3. **Getting unread count**:
   ```javascript
   const count = thread.getUnreadCount(userId)
   // Returns count from unreadCounts array
   ```

### **Thread List Display**
```
GET /api/threads?userId=user123
```
Returns threads with `unreadCount` for each:
```json
{
  "threads": [
    {
      "_id": "thread1",
      "lastMessageText": "Hello!",
      "unreadCount": 3  // ← Shows badge count
    }
  ]
}
```

---

## 🔐 End-to-End Encryption (E2EE)

### **How E2EE Works**

1. **Client-side encryption**:
   ```javascript
   // User types message
   const plainText = "Hello!"
   
   // Encrypt using recipient's public key
   const encrypted = encrypt(plainText, recipientPublicKey)
   const { ciphertext, iv } = encrypted
   ```

2. **Send encrypted message**:
   ```javascript
   socket.emit('send_message', {
     threadId: "thread123",
     ciphertext: encrypted.ciphertext,
     iv: encrypted.iv,
     text: ""  // Optional: empty for E2EE
   })
   ```

3. **Storage**:
   - Server stores `ciphertext` and `iv`
   - Server **cannot** read the message
   - Only recipients with private key can decrypt

4. **Decryption**:
   ```javascript
   // Client receives message
   socket.on('new_message', (data) => {
     const decrypted = decrypt(data.message.ciphertext, privateKey, data.message.iv)
     // Display decrypted message
   })
   ```

### **Plain Text Mode**
- Set `text` field directly
- No encryption/decryption needed
- Useful for system messages or non-sensitive chats

---

## 🎯 Frontend Integration Example

### **React Component Structure**

```javascript
import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

function ChatComponent({ threadId, userId }) {
  const [messages, setMessages] = useState([])
  const [socket, setSocket] = useState(null)
  const [inputText, setInputText] = useState('')

  // 1. Connect to Socket.IO
  useEffect(() => {
    const newSocket = io('http://localhost:7000', {
      auth: { token: localStorage.getItem('token'), userId }
    })
    
    // 2. Join thread room
    newSocket.emit('join-room', threadId)
    
    // 3. Listen for new messages
    newSocket.on('new_message', (data) => {
      if (data.threadId === threadId) {
        setMessages(prev => [...prev, data.message])
      }
    })
    
    setSocket(newSocket)
    
    return () => {
      newSocket.disconnect()
    }
  }, [threadId, userId])

  // 4. Load existing messages
  useEffect(() => {
    fetch(`/api/threads/${threadId}/messages`)
      .then(res => res.json())
      .then(data => setMessages(data.messages))
  }, [threadId])

  // 5. Send message
  const handleSend = () => {
    if (!inputText.trim()) return
    
    // Option A: Via Socket.IO (real-time)
    socket.emit('send_message', {
      threadId,
      senderId: userId,
      text: inputText,
      messageType: 'text'
    })
    
    // Option B: Via REST API (fallback)
    // fetch(`/api/threads/${threadId}/messages`, {
    //   method: 'POST',
    //   body: JSON.stringify({ senderId: userId, text: inputText })
    // })
    
    setInputText('')
  }

  // 6. Mark as read when viewing
  useEffect(() => {
    if (messages.length > 0) {
      socket.emit('mark_read', {
        threadId,
        userId
      })
    }
  }, [messages.length, threadId, userId, socket])

  return (
    <div>
      {/* Message list */}
      <div>
        {messages.map(msg => (
          <div key={msg._id}>
            {msg.text}
          </div>
        ))}
      </div>
      
      {/* Input */}
      <input 
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  )
}
```

---

## 📋 API Endpoints Summary

### **Threads**
- `POST /api/threads` - Create thread
- `GET /api/threads?userId=xyz` - List user's threads
- `GET /api/threads/:threadId/messages` - Get messages
- `POST /api/threads/:threadId/messages` - Send message

### **Legacy Chat Rooms** (still supported)
- `POST /api/chat/rooms` - Create chat room
- `GET /api/chat/rooms` - List rooms
- `GET /api/chat/rooms/:id/messages` - Get messages
- `POST /api/chat/rooms/:id/messages` - Send message

---

## 🔄 Data Flow Diagram

```
┌─────────┐         ┌──────────┐         ┌─────────┐
│ Client  │────────▶│  Socket  │────────▶│ Server  │
│   A     │  emit   │    IO    │  emit   │         │
└─────────┘         └──────────┘         └─────────┘
     │                                       │
     │                                       │
     │                                       ▼
     │                                  ┌─────────┐
     │                                  │ MongoDB │
     │                                  │         │
     │                                  └─────────┘
     │                                       │
     │                                       │
     ▼                                       │
┌─────────┐                                 │
│ Client  │◀────────────────────────────────┘
│   B     │  receive via Socket.IO
└─────────┘
```

---

## 🎨 Key Features

✅ **Real-time messaging** via Socket.IO  
✅ **Unread count tracking** per thread per user  
✅ **Read receipts** (who read what and when)  
✅ **E2EE support** (encrypted messages)  
✅ **Plain text mode** (for system messages)  
✅ **Thread-based architecture** (organized conversations)  
✅ **1-on-1 and group chats** support  
✅ **Message pagination** (load older messages)  
✅ **Automatic read marking** when fetching messages  

---

## 🚀 Getting Started

1. **Create a thread**:
   ```javascript
   POST /api/threads
   { memberIds: [userId1, userId2] }
   ```

2. **Connect Socket.IO**:
   ```javascript
   const socket = io('http://localhost:7000')
   socket.emit('join-room', threadId)
   ```

3. **Send message**:
   ```javascript
   socket.emit('send_message', {
     threadId, senderId, text
   })
   ```

4. **Listen for messages**:
   ```javascript
   socket.on('new_message', (data) => {
     console.log('New message:', data.message)
   })
   ```

---

## 📝 Notes

- **Threads** and **ChatRooms** are the same concept (threads are the newer naming)
- Both REST API and Socket.IO can be used (Socket.IO is preferred for real-time)
- Unread counts are maintained per user per thread
- Read receipts are tracked in the `readBy` array on each message
- E2EE messages require client-side encryption/decryption
- Plain text messages can be sent directly via `text` field

