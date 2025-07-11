const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    participants: [
        { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    ],
    lastMessage: { type: String, default: '' },
    lastHour: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Conversation', ConversationSchema);
