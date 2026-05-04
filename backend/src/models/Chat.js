const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage:      { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  isSavedMessages:  { type: Boolean, default: false }, // "Message Yourself" chat
  favouritedBy:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pinnedBy:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  archivedBy:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedFor:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  clearedFor:       [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, clearedAt: Date }],
  // Per-user draft messages: [{ userId, text }]
  drafts:           [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, text: String }],
}, { timestamps: true });

// Ensure only one saved-messages chat per user
chatSchema.index(
  { isSavedMessages: 1, 'participants': 1 },
  { unique: true, sparse: true, partialFilterExpression: { isSavedMessages: true } }
);

module.exports = mongoose.model('Chat', chatSchema);
