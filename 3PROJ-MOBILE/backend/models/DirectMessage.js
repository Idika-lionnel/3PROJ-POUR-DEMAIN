const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true }
}, { _id: false }); // Pas besoin d'id pour chaque réaction

const directMessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String },
  attachmentUrl: { type: String },
  type: { type: String, enum: ['text', 'file'], default: 'text' },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  reactions: [reactionSchema]  // ✅ Nouveau champ ajouté
});

module.exports = mongoose.model('DirectMessage', directMessageSchema);
