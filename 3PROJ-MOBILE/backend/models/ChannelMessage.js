const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true }
}, { _id: false });

const channelMessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  content: { type: String },
  attachmentUrl: { type: String },
  type: { type: String, enum: ['text', 'file'], default: 'text' }, // ✅ Ajouté
  reactions: [reactionSchema],
}, { timestamps: true });


module.exports = mongoose.model('ChannelMessage', channelMessageSchema);
