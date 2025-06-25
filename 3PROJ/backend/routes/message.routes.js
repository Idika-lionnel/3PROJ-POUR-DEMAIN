// ✅ routes/message.routes.js
const express = require('express');
const router = express.Router();
const DirectMessage = require('../models/DirectMessage');
const Conversation = require('../models/Conversation');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');


// 📁 Configuration de stockage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});
const upload = multer({ storage });

/** 📩 Envoi d’un message texte */
router.post('/', async (req, res) => {
    try {
        const { senderId, receiverId, content, type, attachmentUrl, replyTo } = req.body;

        const message = await DirectMessage.create({
            senderId,
            receiverId,
            content,
            type,
            attachmentUrl,
            replyTo
        });

        const contentPreview = content || '[Message]';
        await Conversation.findOneAndUpdate(
            { participants: { $all: [senderId, receiverId] } },
            {
                participants: [senderId, receiverId],
                lastMessage: contentPreview,
                lastHour: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                updatedAt: Date.now()
            },
            { upsert: true, new: true }
        );

        res.status(201).json(message);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** 📨 Récupération des messages entre 2 utilisateurs */
router.get('/:userId', async (req, res) => {
    try {
        const currentUserId = req.query.currentUserId;
        const otherUserId = req.params.userId;

        const messages = await DirectMessage.find({
            $or: [
                { senderId: currentUserId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: currentUserId }
            ]
        })
            .sort({ timestamp: 1 })
            .populate('senderId', 'prenom nom');

        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🗂️ Upload de fichier
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { senderId, receiverId, type } = req.body;
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        const originalName = req.file.originalname;

        // Crée le message
        const message = await DirectMessage.create({
            senderId,
            receiverId,
            type: type || 'file',
            attachmentUrl: fileUrl,
            content: originalName
        });

        // ✅ Crée ou met à jour la conversation, sans conflit MongoDB
        const senderObjId = new mongoose.Types.ObjectId(senderId);
        const receiverObjId = new mongoose.Types.ObjectId(receiverId);

        const existing = await Conversation.findOne({
            participants: { $all: [senderObjId, receiverObjId] },
            $expr: { $eq: [{ $size: "$participants" }, 2] }
        });

        if (existing) {
            await Conversation.updateOne(
                { _id: existing._id },
                {
                    $set: {
                        lastMessage: originalName,
                        lastHour: new Date().toISOString().slice(11, 16),
                        updatedAt: new Date()
                    }
                }
            );
        } else {
            await Conversation.create({
                participants: [senderObjId, receiverObjId],
                lastMessage: originalName,
                lastHour: new Date().toISOString().slice(11, 16),
                updatedAt: new Date()
            });
        }

        // ✅ Émet le message aux 2 participants
        const populated = await DirectMessage.findById(message._id).populate('senderId', 'prenom nom');

        const io = req.app.get('io');
        if (io) {
            const payload = {
                _id: populated._id, // ✅ important pour le frontend
                content: populated.content,
                senderId: populated.senderId,
                timestamp: populated.timestamp,
                type: populated.type,
                attachmentUrl: populated.attachmentUrl
            };

            io.to(receiverId).emit('new_direct_message', payload);
            io.to(senderId).emit('new_direct_message', payload); // ✅ émet aussi à l'expéditeur
        }

        res.status(201).json(populated);
    } catch (err) {
        console.error('❌ Erreur upload fichier:', err);
        res.status(500).json({ error: err.message });
    }


});

// ➕ Ajouter une réaction à un message direct
router.post('/reaction/:messageId', async (req, res) => {
    const { emoji, userId } = req.body;
    const { messageId } = req.params;

    if (!emoji || !userId) {
        return res.status(400).json({ error: 'Emoji et userId requis' });
    }

    try {
        const message = await DirectMessage.findById(messageId);
        if (!message) return res.status(404).json({ error: 'Message introuvable' });

        // Si même emoji existe déjà, on le supprime d'abord
        message.reactions = message.reactions.filter(
            r => !(String(r.userId) === String(userId) && r.emoji === emoji)
        );

        // Ajoute la nouvelle réaction
        message.reactions.push({ userId, emoji });
        await message.save();

        // Émet un événement socket
        const fullUser = await mongoose.model('User').findById(userId).select('prenom nom');
        req.app.get("io").to(message.senderId.toString()).emit("direct_reaction_updated", {
            messageId,
            emoji,
            user: { _id: userId, prenom: fullUser.prenom, nom: fullUser.nom }
        });
        req.app.get("io").to(message.receiverId.toString()).emit("direct_reaction_updated", {
            messageId,
            emoji,
            user: { _id: userId, prenom: fullUser.prenom, nom: fullUser.nom }
        });

        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Erreur ajout réaction direct :", err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ❌ Supprimer une réaction à un message direct
router.delete('/reaction/:messageId', async (req, res) => {
    const { userId } = req.body;
    const { messageId } = req.params;

    if (!userId) return res.status(400).json({ error: 'userId requis' });

    try {
        const message = await DirectMessage.findById(messageId);
        if (!message) return res.status(404).json({ error: 'Message introuvable' });

        message.reactions = message.reactions.filter(
            r => String(r.userId) !== String(userId)
        );
        await message.save();

        req.app.get("io").to(message.senderId.toString()).emit("direct_reaction_removed", {
            messageId,
            userId
        });
        req.app.get("io").to(message.receiverId.toString()).emit("direct_reaction_removed", {
            messageId,
            userId
        });

        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Erreur suppression réaction direct :", err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// marquer les messages comme lus
router.patch('/mark-read/:contactId', async (req, res) => {
    try {
        const { currentUserId } = req.body;
        const { contactId } = req.params;

        await DirectMessage.updateMany(
            {
                senderId: contactId,
                receiverId: currentUserId,
                read: false
            },
            { $set: { read: true } }
        );

        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Erreur mark-read", err);
        res.status(500).json({ error: 'Erreur lors du marquage en lu' });
    }
});
// afficher badge

router.get('/unread-count/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // Groupe les messages non lus par sender
        const unreadCounts = await DirectMessage.aggregate([
            {
                $match: {
                    receiverId: new mongoose.Types.ObjectId(userId),
                    read: false
                }
            },
            {
                $group: {
                    _id: '$senderId',
                    count: { $sum: 1 }
                }
            }
        ]);

        const formatted = {};
        unreadCounts.forEach(item => {
            formatted[item._id.toString()] = item.count;
        });

        res.json(formatted);
    } catch (err) {
        console.error('❌ Erreur unread-count :', err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});





module.exports = router;
