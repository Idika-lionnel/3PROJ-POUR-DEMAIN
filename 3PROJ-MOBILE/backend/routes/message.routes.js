const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Message = require('../models/DirectMessage');
const fs = require('fs');

const SERVER_URL = process.env.SERVER_URL || `http://localhost:5051`;

// 📁 Config multer (stockage fichiers)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// 📤 Route POST pour envoyer un fichier
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });

    const { senderId, receiverId, type } = req.body;
    if (!senderId || !receiverId) return res.status(400).json({ error: 'Champs manquants' });

    const newMsg = await Message.create({
      senderId,
      receiverId,
      type: type || 'file',
      attachmentUrl: `${SERVER_URL}/uploads/${req.file.filename}`,
      timestamp: new Date().toISOString(),
      read: false,
    });

    const io = req.app.get('io');
    io.to(receiverId).emit('new_direct_message', newMsg);
    io.to(senderId).emit('new_direct_message', newMsg);

    res.status(200).json(newMsg);
  } catch (err) {
    console.error('❌ Erreur upload fichier :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 🔁 Récupération des messages entre deux utilisateurs
router.get('/:receiverId', async (req, res) => {
  const { currentUserId } = req.query;
  const { receiverId } = req.params;

  try {
    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId },
        { senderId: receiverId, receiverId: currentUserId }
      ]
    }).sort('timestamp');

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Erreur chargement messages' });
  }
});

// ✅ Marquer les messages reçus comme lus
router.patch('/read/:senderId/:receiverId', async (req, res) => {
  const { senderId, receiverId } = req.params;
  try {
    await Message.updateMany(
      { senderId, receiverId, read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ message: 'Messages marqués comme lus' });
  } catch (err) {
    console.error('Erreur marquage lus :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ Ajouter une réaction
router.post('/reaction/:messageId', async (req, res) => {
  const { messageId } = req.params;
  const { userId, emoji } = req.body;

  if (!userId || !emoji) return res.status(400).json({ error: 'userId et emoji requis' });

  try {
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message non trouvé' });

    const existing = msg.reactions.find(r => r.userId.toString() === userId);
    if (existing) {
      existing.emoji = emoji; // remplace la réaction
    } else {
      msg.reactions.push({ userId, emoji });
    }

    await msg.save();

    const io = req.app.get('io');
    io.to(msg.receiverId.toString()).emit('reaction_updated', { messageId, userId, emoji });
    io.to(msg.senderId.toString()).emit('reaction_updated', { messageId, userId, emoji });

    res.json({ message: 'Réaction ajoutée/modifiée' });
  } catch (err) {
    console.error('Erreur ajout réaction :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ❌ Supprimer sa réaction
router.delete('/reaction/:messageId', async (req, res) => {
  const { messageId } = req.params;
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ error: 'userId requis' });

  try {
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message non trouvé' });

    msg.reactions = msg.reactions.filter(r => r.userId.toString() !== userId);
    await msg.save();

    const io = req.app.get('io');
    io.to(msg.receiverId.toString()).emit('reaction_removed', { messageId, userId });
    io.to(msg.senderId.toString()).emit('reaction_removed', { messageId, userId });

    res.json({ message: 'Réaction supprimée' });
  } catch (err) {
    console.error('Erreur suppression réaction :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
