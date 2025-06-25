const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');

// 🔐 Middleware d’authentification (optionnel)
//const requireAuth = require('../middlewares/requireAuth');

router.get('/:userId', /* requireAuth, */ async (req, res) => {
    const { userId } = req.params;

    try {
        const conversations = await Conversation.find({
            participants: new mongoose.Types.ObjectId(userId)
        })
            .populate('participants', '_id prenom nom email')
            .sort({ updatedAt: -1 });

        res.json(conversations);
    } catch (err) {
        console.error('Erreur chargement conversations :', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
