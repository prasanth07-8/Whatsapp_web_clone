const Chat    = require('../models/Chat');
const Message = require('../models/Message');

// Get or create "Message Yourself" / Saved Messages chat
exports.accessSavedMessages = async (req, res) => {
  try {
    // Find all saved-messages chats for this user (handle legacy duplicates)
    const allSaved = await Chat.find({
      isSavedMessages: true,
      participants: req.userId,
    }).sort({ createdAt: 1 });

    // If duplicates exist, delete all but the oldest
    if (allSaved.length > 1) {
      const toDelete = allSaved.slice(1).map(c => c._id);
      await Chat.deleteMany({ _id: { $in: toDelete } });
    }

    let chat = allSaved[0] || null;

    if (!chat) {
      chat = await Chat.create({
        participants: [req.userId],
        isSavedMessages: true,
      });
    } else if (chat.deletedFor?.map(String).includes(req.userId)) {
      chat.deletedFor = chat.deletedFor.filter(id => id.toString() !== req.userId);
      await chat.save();
    }

    chat = await Chat.findById(chat._id)
      .populate('participants', '-password')
      .populate({ path: 'lastMessage', populate: { path: 'senderId', select: 'username' } });

    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get or create a chat — also restores deleted chats when new message arrives
exports.accessChat = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    let chat = await Chat.findOne({
      participants: { $all: [req.userId, userId], $size: 2 },
    })
      .populate('participants', '-password')
      .populate({ path: 'lastMessage', populate: { path: 'senderId', select: 'username' } });

    if (!chat) {
      chat = await Chat.create({ participants: [req.userId, userId] });
      chat = await Chat.findById(chat._id).populate('participants', '-password');
    } else {
      // Restore chat if it was deleted for this user
      if (chat.deletedFor.map(String).includes(req.userId)) {
        chat.deletedFor = chat.deletedFor.filter(id => id.toString() !== req.userId);
        await chat.save();
        chat = await Chat.findById(chat._id)
          .populate('participants', '-password')
          .populate({ path: 'lastMessage', populate: { path: 'senderId', select: 'username' } });
      }
    }

    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all chats with unread counts (exclude locally deleted)
exports.getChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.userId,
      deletedFor: { $ne: req.userId },
    })
      .populate('participants', '-password')
      .populate({ path: 'lastMessage', populate: { path: 'senderId', select: 'username' } })
      .sort({ updatedAt: -1 });

    const withUnread = await Promise.all(chats.map(async (chat) => {
      const cleared = chat.clearedFor?.find(c => c.userId.toString() === req.userId);
      const unreadQuery = {
        chatId: chat._id,
        deletedFor: { $ne: req.userId },
        status: { $ne: 'read' },
      };
      // For normal chats only count messages received by this user
      if (!chat.isSavedMessages) unreadQuery.receiverId = req.userId;
      if (cleared) unreadQuery.createdAt = { $gt: cleared.clearedAt };

      const unreadCount = await Message.countDocuments(unreadQuery);
      const isFavourite = chat.favouritedBy?.some(id => id.toString() === req.userId) || false;
      const isPinned    = chat.pinnedBy?.some(id => id.toString() === req.userId) || false;
      const isArchived  = chat.archivedBy?.some(id => id.toString() === req.userId) || false;
      const draft       = chat.drafts?.find(d => d.userId.toString() === req.userId)?.text || '';
      return { ...chat.toObject(), unreadCount, isFavourite, isPinned, isArchived, draft };
    }));

    res.json(withUnread);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Clear chat — permanently delete ALL messages from DB for this chat
// WhatsApp behavior: messages gone, chat stays in sidebar empty
exports.clearChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { deleteStarred } = req.body; // optional: also delete starred messages

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!chat.participants.some(p => p.toString() === req.userId))
      return res.status(403).json({ message: 'Not allowed' });

    const query = { chatId };
    if (!deleteStarred) query.isStarred = { $ne: true }; // keep starred unless opted in

    await Message.deleteMany(query);

    // Reset lastMessage
    const lastMsg = await Message.findOne({ chatId }).sort({ createdAt: -1 });
    chat.lastMessage = lastMsg?._id || null;
    await chat.save();

    res.json({ success: true, chatId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete chat — hide from THIS user's sidebar only (WhatsApp behavior)
// Messages stay in DB. Other user still sees the chat.
// If other user messages again, chat reappears for this user with new messages only.
exports.deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!chat.participants.some(p => p.toString() === req.userId))
      return res.status(403).json({ message: 'Not allowed' });

    // Mark as deleted for this user only
    if (!chat.deletedFor.map(String).includes(req.userId)) {
      chat.deletedFor.push(req.userId);
    }
    await chat.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Toggle favourite
exports.toggleFavourite = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    const isFav = chat.favouritedBy.some(id => id.toString() === req.userId);
    if (isFav) {
      chat.favouritedBy = chat.favouritedBy.filter(id => id.toString() !== req.userId);
    } else {
      chat.favouritedBy.push(req.userId);
    }
    await chat.save();
    res.json({ isFavourite: !isFav });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Toggle pin
exports.togglePin = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    const isPinned = chat.pinnedBy.some(id => id.toString() === req.userId);
    if (isPinned) {
      chat.pinnedBy = chat.pinnedBy.filter(id => id.toString() !== req.userId);
    } else {
      chat.pinnedBy.push(req.userId);
    }
    await chat.save();
    res.json({ isPinned: !isPinned });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Toggle archive
exports.toggleArchive = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    const isArchived = chat.archivedBy.some(id => id.toString() === req.userId);
    if (isArchived) {
      chat.archivedBy = chat.archivedBy.filter(id => id.toString() !== req.userId);
    } else {
      chat.archivedBy.push(req.userId);
    }
    await chat.save();
    res.json({ isArchived: !isArchived });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mark all messages in a chat as read
exports.markChatRead = async (req, res) => {
  try {
    await Message.updateMany(
      { chatId: req.params.chatId, receiverId: req.userId, status: { $ne: 'read' } },
      { status: 'read' }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Save or clear draft for a chat
exports.saveDraft = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text } = req.body; // empty string = clear draft

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    if (!chat.drafts) chat.drafts = [];

    const existing = chat.drafts.find(d => d.userId.toString() === req.userId);
    if (text && text.trim()) {
      if (existing) {
        existing.text = text.trim();
      } else {
        chat.drafts.push({ userId: req.userId, text: text.trim() });
      }
    } else {
      // Clear draft
      chat.drafts = chat.drafts.filter(d => d.userId.toString() !== req.userId);
    }

    await chat.save();
    res.json({ success: true, draft: text?.trim() || '' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
