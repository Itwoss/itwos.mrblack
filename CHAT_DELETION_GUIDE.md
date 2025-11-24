# Chat Deletion & Clearing Guide

## Menu Options Explained

The chat header has a 3-dot menu (⋮) with the following options:

---

## 1. Clear Messages

**What it does:**
- Clears **all messages** in the **currently open conversation**
- Only affects **your view** - messages are hidden from you
- **Other participants** can still see all messages
- The **conversation thread remains** - you can still see the conversation in your list
- You can continue chatting in this conversation

**When to use:**
- You want to hide all messages in a specific conversation
- You want to keep the conversation but remove message history
- You want a fresh start in that conversation

**Example:**
- You have 100 messages with User A
- You click "Clear Messages"
- You see 0 messages (empty chat)
- User A still sees all 100 messages
- You can still send new messages to User A

---

---

## 3. Delete Conversation

**What it does:**
- **Removes the entire conversation** from your conversation list
- The conversation **disappears** from your sidebar
- Only affects **your view** - the conversation is hidden from you
- **Other participants** can still see the conversation in their list
- **All messages remain** in the database (just hidden from you)
- If the other person sends you a new message, the conversation will reappear

**When to use:**
- You want to remove a conversation from your list
- You don't want to see that conversation anymore
- You want to hide a conversation but keep the option to restore it later

**Example:**
- You have a conversation with User A
- You click "Delete Conversation"
- The conversation disappears from your sidebar
- User A still sees the conversation in their sidebar
- If User A sends you a new message, the conversation reappears for you

---

---

## Key Differences

### Clear vs Delete

| Feature | Clear Messages | Delete Conversation |
|---------|---------------|-------------------|
| **Messages** | Hidden from you | Still visible (conversation is hidden) |
| **Conversation** | Still visible in list | Hidden from list |
| **Can send new messages?** | Yes | Yes (if conversation restored) |
| **Other users affected?** | No | No |

### Single Conversation Only

| Feature | Single (Current) |
|---------|-----------------|
| **Scope** | One conversation |
| **Speed** | Fast |
| **Use case** | Specific cleanup |

---

## Visual Comparison

### Before Actions:
```
Your Sidebar:
├── Conversation with User A (100 messages)
├── Conversation with User B (50 messages)
└── Conversation with User C (200 messages)
```

### After "Clear Messages" (on User A conversation):
```
Your Sidebar:
├── Conversation with User A (0 messages) ← Empty but visible
├── Conversation with User B (50 messages)
└── Conversation with User C (200 messages)
```


### After "Delete Conversation" (User A):
```
Your Sidebar:
├── Conversation with User B (50 messages)
└── Conversation with User C (200 messages)
← User A conversation hidden
```


---

## Security & Privacy

✅ **All actions are per-user:**
- Only YOUR view is affected
- Other users' views remain unchanged
- No one else can see what you deleted/cleared

✅ **Data is preserved:**
- Messages are not permanently deleted from database
- Conversations can be restored if someone sends a new message
- Soft deletion ensures data recovery if needed

✅ **Authentication required:**
- All actions require login
- Only you can delete/clear your own data
- No cross-user data access

---

## Technical Details

### Clear Messages
- **Backend:** `DELETE /api/threads/:threadId/messages`
- **Database:** Adds user ID to `deletedByUsers` array in each message
- **Query:** Filters messages where `deletedByUsers` contains current user


### Delete Conversation
- **Backend:** `DELETE /api/threads/:threadId`
- **Database:** Adds user ID to `deletedByUsers` array in ChatRoom
- **Query:** Filters threads where `deletedByUsers` contains current user

- **Backend:** `DELETE /api/threads`
- **Database:** Bulk update adds user ID to `deletedByUsers` in all ChatRooms
- **Query:** Processes all threads where user is a participant

---

## Best Practices

1. **Use "Clear Messages"** when you want to hide message history but keep the conversation
2. **Use "Delete Conversation"** when you want to remove a conversation from your list

---

## FAQ

**Q: Can I recover deleted conversations?**
A: Yes! If someone sends you a new message, the conversation will automatically reappear.

**Q: Do other users know I deleted/cleared?**
A: No, these actions are completely private. Other users see no changes.

**Q: Are messages permanently deleted?**
A: No, they're soft-deleted (hidden from you). They remain in the database.


**Q: What's the difference between clearing and deleting?**
A: Clearing hides messages but keeps the conversation visible. Deleting hides the entire conversation from your list.

