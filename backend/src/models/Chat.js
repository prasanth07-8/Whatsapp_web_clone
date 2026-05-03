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
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
