const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  senderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:        { type: String, default: '', trim: true },
  // media support
  mediaUrl:    { type: String, default: null },   // file path served by backend
  mediaType:   { type: String, enum: ['image', 'video', 'audio', 'file', null], default: null },
  mediaName:   { type: String, default: null },   // original filename
  messageType: { type: String, enum: ['text', 'image', 'video', 'audio', 'file', 'poll', 'contact', 'event'], default: 'text' },
  // Poll data
  poll: {
    question: String,
    options:  [{ text: String, votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] }],
    multiSelect: { type: Boolean, default: false },
  },
  // Contact card
  contact: {
    name:  String,
    phone: String,
    email: String,
  },
  // Event
  event: {
    title:    String,
    date:     String,
    time:     String,
    location: String,
    note:     String,
  },
  status:      { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  isDeleted:   { type: Boolean, default: false },
  isEdited:    { type: Boolean, default: false },
  isStarred:   { type: Boolean, default: false },
  isPinned:    { type: Boolean, default: false },
  deletedFor:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replyTo:     { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
}, { timestamps: true });

messageSchema.index({ chatId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
