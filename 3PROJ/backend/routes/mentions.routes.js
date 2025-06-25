const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const Mention = require('../models/Mention');

router.get('/', requireAuth, async (req, res) => {
    try {
        const mentions = await Mention.find({ userId: req.user._id }).sort({ timestamp: -1 });
        res.json(mentions);
    } catch (err) {
        console.error('❌ Erreur récupération mentions :', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
