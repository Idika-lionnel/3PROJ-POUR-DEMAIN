const mongoose = require('mongoose');

// ✅ Schéma des réactions (réutilisable et clair)
const reactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true }
}, { _id: false });

// ✅ Schéma principal des messages directs
const directMessageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    content: { type: String },
    type: {
        type: String,
        enum: ['text', 'file', 'image'],
        default: 'text'
    },
    attachmentUrl: { type: String, default: null },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'DirectMessage', default: null },

    read: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },

    reactions: [reactionSchema] // ✅ réactions réutilisables et propres
}, { timestamps: true });

module.exports = mongoose.model('DirectMessage', directMessageSchema);
