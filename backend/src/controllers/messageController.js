const Message = require('../models/Message');
const Chat    = require('../models/Chat');

const populate = (q) => q
  .populate('senderId', 'username email avatar')
  .populate('replyTo')
  .populate('poll.options.votes', 'username avatar');

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, receiverId, text, replyTo, mediaUrl, mediaType, mediaName, messageType, poll, contact, event } = req.body;

    if (!chatId || !receiverId)
      return res.status(400).json({ message: 'chatId and receiverId are required' });

    // Special message types don't need text or media
    const specialTypes = ['poll', 'contact', 'event'];
    if (!specialTypes.includes(messageType) && !text?.trim() && !mediaUrl)
      return res.status(400).json({ message: 'Message must have text or media' });

    const message = await Message.create({
      chatId, senderId: req.userId,
      receiverId: receiverId || req.userId, // self-chat: receiverId = senderId
      text: text?.trim() || '',
      replyTo: replyTo || null,
      mediaUrl:    mediaUrl    || null,
      mediaType:   mediaType   || null,
      mediaName:   mediaName   || null,
      messageType: messageType || 'text',
      ...(poll    && { poll }),
      ...(contact && { contact }),
      ...(event   && { event }),
      status: 'sent',
    });

    await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id, updatedAt: Date.now() });
    const populated = await populate(Message.findById(message._id));
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all messages for a chat (exclude messages deleted for this user)
exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const messages = await populate(
      Message.find({ chatId, deletedFor: { $ne: req.userId } }).sort({ createdAt: 1 })
    );
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mark as read (single chat)
exports.markAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    await Message.updateMany(
      { chatId, receiverId: req.userId, status: { $ne: 'read' } },
      { status: 'read' }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mark all messages as read across all chats
exports.markAllRead = async (req, res) => {
  try {
    await Message.updateMany(
      { receiverId: req.userId, status: { $ne: 'read' } },
      { status: 'read' }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete message
exports.deleteMessage = async (req, res) => {
  try {
    const { deleteFor } = req.body;
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    const isOwn = msg.senderId.toString() === req.userId;

    if (deleteFor === 'everyone') {
      if (!isOwn) return res.status(403).json({ message: 'Only sender can delete for everyone' });
      // WhatsApp limit: 68 min 16 sec (4096 seconds) for "delete for everyone"
      const ageMs = Date.now() - new Date(msg.createdAt).getTime();
      if (ageMs > 4096 * 1000)
        return res.status(403).json({ message: 'Time limit exceeded. You can no longer delete this message for everyone.' });
      msg.isDeleted = true;
      msg.text = 'This message was deleted';
      await msg.save();

      // Update chat.lastMessage to the most recent non-deleted message
      const prevMsg = await Message.findOne({
        chatId: msg.chatId,
        isDeleted: false,
        _id: { $ne: msg._id },
      }).sort({ createdAt: -1 });
      await Chat.findByIdAndUpdate(msg.chatId, {
        lastMessage: prevMsg ? prevMsg._id : null,
        updatedAt: Date.now(),
      });

      const populated = await populate(Message.findById(msg._id));
      return res.json({ ...populated.toObject(), deletedForEveryone: true });
    }

    if (!msg.deletedFor) msg.deletedFor = [];
    if (!msg.deletedFor.includes(req.userId)) msg.deletedFor.push(req.userId);
    await msg.save();
    return res.json({ _id: msg._id, deletedForMe: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Edit message
exports.editMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Text required' });
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    if (msg.senderId.toString() !== req.userId)
      return res.status(403).json({ message: 'Not allowed' });
    if (msg.isDeleted) return res.status(400).json({ message: 'Cannot edit deleted message' });
    msg.text     = text.trim();
    msg.isEdited = true;
    await msg.save();
    const populated = await populate(Message.findById(msg._id));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Star / unstar message
exports.starMessage = async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    msg.isStarred = !msg.isStarred;
    await msg.save();
    res.json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all starred messages for the current user (across all chats)
exports.getStarred = async (req, res) => {
  try {
    const messages = await populate(
      Message.find({ isStarred: true, deletedFor: { $ne: req.userId } }).sort({ createdAt: -1 })
    );
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Pin / unpin message
exports.pinMessage = async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    msg.isPinned = !msg.isPinned;
    await msg.save();
    res.json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get pinned messages for a chat
exports.getPinned = async (req, res) => {
  try {
    const messages = await populate(
      Message.find({ chatId: req.params.chatId, isPinned: true }).sort({ createdAt: -1 })
    );
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Vote on a poll option
exports.votePoll = async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const msg = await Message.findById(req.params.id);
    if (!msg || msg.messageType !== 'poll')
      return res.status(404).json({ message: 'Poll not found' });

    msg.poll.options.forEach((opt) => {
      opt.votes = opt.votes.filter((v) => v.toString() !== req.userId);
    });

    const opt = msg.poll.options[optionIndex];
    if (!opt) return res.status(400).json({ message: 'Invalid option' });

    const alreadyVoted = opt.votes.some((v) => v.toString() === req.userId);
    if (!alreadyVoted) opt.votes.push(req.userId);

    await msg.save();
    const populated = await populate(Message.findById(msg._id));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all media messages for the current user (across all chats they're part of)
exports.getAllMedia = async (req, res) => {
  try {
    const Chat = require('../models/Chat');
    // Find all chats this user is part of
    const userChats = await Chat.find({ participants: req.userId }).select('_id');
    const chatIds = userChats.map((c) => c._id);

    const messages = await Message.find({
      chatId: { $in: chatIds },
      mediaUrl: { $ne: null },
      isDeleted: false,
      deletedFor: { $ne: req.userId },
    })
      .populate('senderId', 'username avatar')
      .populate('chatId', 'participants')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// React to a message (toggle: add if not present, remove if same emoji already set)
exports.reactToMessage = async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ message: 'emoji required' });

    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    if (msg.isDeleted) return res.status(400).json({ message: 'Cannot react to deleted message' });

    if (!msg.reactions) msg.reactions = [];

    const existing = msg.reactions.find(
      (r) => r.userId.toString() === req.userId
    );

    if (existing) {
      if (existing.emoji === emoji) {
        // Same emoji — remove (toggle off)
        msg.reactions = msg.reactions.filter(
          (r) => r.userId.toString() !== req.userId
        );
      } else {
        // Different emoji — replace
        existing.emoji = emoji;
      }
    } else {
      // New reaction
      msg.reactions.push({ emoji, userId: req.userId });
    }

    await msg.save();
    const populated = await populate(Message.findById(msg._id));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
