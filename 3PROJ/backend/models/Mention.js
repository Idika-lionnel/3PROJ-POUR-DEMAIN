const mongoose = require('mongoose');

const mentionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChannelMessage', required: true },
    content: { type: String },
    timestamp: { type: Date, default: Date.now },
    channelName: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Mention', mentionSchema);
