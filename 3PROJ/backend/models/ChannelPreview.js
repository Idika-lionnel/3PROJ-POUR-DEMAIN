// models/ChannelPreview.js
const mongoose = require('mongoose');

const channelPreviewSchema = new mongoose.Schema({
    channelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
        required: true,
        unique: true
    },
    lastMessage: {
        type: String,
        default: ''
    },
    lastHour: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('ChannelPreview', channelPreviewSchema);
