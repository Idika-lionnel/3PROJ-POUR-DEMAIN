const express = require('express');
const multer = require('multer');
const path = require('path');
const Channel = require('../models/Channel');
const ChannelMessage = require('../models/ChannelMessage');
const auth = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const upload = multer({ storage });

router.post('/:channelId', auth, upload.single('file'), async (req, res) => {
    try {
        const { channelId } = req.params;
        const { senderName } = req.body;

        // Vérification canal
        const channel = await Channel.findById(channelId);
        if (!channel) return res.status(404).json({ error: 'Canal introuvable' });

        const isMember = channel.members.some(m => m.equals(req.user._id));
        if (!isMember) return res.status(403).json({ error: 'Non autorisé à poster ici' });

        // Traitement fichier
        const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        const inferredType = req.file.mimetype.startsWith('image') ? 'image' : 'file';

        // Création du message
        const message = await ChannelMessage.create({
            channelId,
            senderId: req.user._id,
            senderName,
            type: inferredType,
            content: originalName,
            attachmentUrl: fileUrl,
        });

        const io = req.app.get('io');

        // 🔄 Mise à jour de la preview
        const previewText = `${inferredType === 'image' ? '' : ''} ${originalName}`;
        const ChannelPreview = require('../models/ChannelPreview');

        await ChannelPreview.findOneAndUpdate(
            { channelId },
            {
                lastMessage: previewText,
                lastHour: new Date(),
            },
            { upsert: true }
        );

        // Émission socket.io
        if (io) {
            io.to(channelId).emit('new_channel_message', {
                _id: message._id,
                channelId: message.channelId,
                senderId: message.senderId,
                senderName: message.senderName,
                content: message.content,
                type: message.type,
                attachmentUrl: message.attachmentUrl,
                timestamp: message.createdAt
            });

            io.emit('channel_message_preview', {
                channelId,
                preview: previewText,
                timestamp: new Date()
            });
        }

        res.status(201).json(message);
    } catch (err) {
        console.error('❌ Erreur upload fichier canal :', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
