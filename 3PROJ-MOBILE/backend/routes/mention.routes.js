const express = require('express');
const router = express.Router();
const ChannelMessage = require('../models/ChannelMessage');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { prenom, nom } = req.user;

    const patterns = [
      `@${prenom} ${nom}`,
      `@${prenom}.${nom}`,
    ];

    const regex = new RegExp(patterns.join('|'), 'i');

    const messages = await ChannelMessage.find({
      content: { $regex: regex }
    })
      .populate({
        path: 'channel',
        select: 'name workspace',
        populate: {
          path: 'workspace',
          model: 'Workspace',
          select: '_id name',
        }
      })
      .sort({ createdAt: -1 });

    // 🔍 DEBUG complet
    messages.forEach(m => {
      console.log("🧠 MESSAGE = ", m.content);
      console.log("📢 CHANNEL =", m.channel?.name);
      console.log("🏢 WORKSPACE =", m.channel?.workspace);
    });

    const formatted = messages
      .filter(m => m.channel && m.channel.workspace && m.channel.workspace._id)
      .map(m => ({
        _id: m._id,
        content: m.content,
        createdAt: m.createdAt,
        messageId: m._id,
        senderId: m.senderId,
        channelId: m.channel._id,
        channelName: m.channel.name || 'Inconnu',
        workspaceId: m.channel.workspace._id,
      }));

    res.json(formatted);
  } catch (err) {
    console.error("Erreur fetch mentions :", err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
