const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');



const User = require('../models/User');
const DirectMessage = require('../models/DirectMessage');
const ChannelMessage = require('../models/ChannelMessage');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel')


const requireAuth = require('../middleware/auth');

// 📋 Obtenir tous les utilisateurs (pour résoudre les noms)
router.get('/all', requireAuth, async (req, res) => {
  try {
    const users = await User.find({}, '_id prenom nom email');
    res.json(users);
  } catch (err) {
    console.error('❌ Erreur récupération utilisateurs :', err);
    res.status(500).json({ error: 'Erreur récupération utilisateurs' });
  }
});

// 📋 Obtenir tous les utilisateurs sauf soi-même
router.get('/contacts/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const users = await User.find({ _id: { $ne: userId } }, '_id prenom nom email');
    res.json(users);
  } catch (err) {
    console.error('❌ Erreur récupération contacts :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 👤 Obtenir les infos du user connecté
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(user);
  } catch (err) {
    console.error('❌ Erreur /me :', err);
    res.status(500).json({ error: 'Erreur récupération utilisateur' });
  }
});

// 📦 Exporter les données personnelles RGPD
router.get('/export', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('-password -__v');
    const directMessages = await DirectMessage.find({ sender: userId });
    const channelMessages = await ChannelMessage.find({ sender: userId });
    const workspaces = await Workspace.find({ members: userId });

    const exportData = {
      profil: user,
      messagesPrives: directMessages,
      messagesCanaux: channelMessages,
      workspaces,
    };

    const tmpDir = path.join(__dirname, '../tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }

    const filePath = path.join(tmpDir, `export_${userId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));

    res.download(filePath, 'mes_donnees.json', () => {
      fs.unlinkSync(filePath); // suppression après envoi
    });
  } catch (err) {
    console.error('❌ Erreur export données :', err);
    res.status(500).json({ error: 'Erreur lors de l’exportation des données personnelles.' });
  }
});

// ✏️ Mise à jour des infos utilisateur (profil + mdp)
router.put('/update', requireAuth, async (req, res) => {
  try {
    const { prenom, nom, email, password } = req.body;
    const updateData = { prenom, nom, email };

    if (password && password.length >= 6) {
      const hashed = await bcrypt.hash(password, 10);
      updateData.password = hashed;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, { new: true }).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error('❌ Erreur mise à jour profil :', err);
    res.status(500).json({ error: "Erreur lors de la mise à jour du profil" });
  }
});

// 🟢 Mettre à jour le statut (online, busy, offline)
router.put('/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['online', 'busy', 'offline'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { status },
      { new: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (err) {
    console.error('❌ Erreur mise à jour statut :', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' });
  }
});

// Supprimer son propre compte
router.delete("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Supprime l'utilisateur
    await User.findByIdAndDelete(userId);

    // (Facultatif) : Supprimer aussi ses messages, fichiers, etc.

    res.status(200).json({ message: "Compte supprimé avec succès." });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la suppression du compte." });
  }
});
// route pour la récupération des documents
// route pour la récupération des documents
router.get('/documents', requireAuth, async (req, res) => {
  const userId = req.user._id;

  try {
    const directFiles = await DirectMessage.find({
      receiverId: userId,
      attachmentUrl: { $ne: null },
    })
        .sort({ timestamp: -1 })
        .populate('senderId', 'prenom nom');

    const userChannels = await Channel.find({ members: userId }).select('_id name');
    const channelIdToName = Object.fromEntries(userChannels.map(c => [c._id.toString(), c.name]));

    const channelFiles = await ChannelMessage.find({
      channelId: { $in: userChannels.map(c => c._id) },
      attachmentUrl: { $ne: null },
    }).sort({ createdAt: -1 });

    const detectFileType = (url) => {
      const ext = (url || '').toLowerCase();
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(ext) ? 'image' : 'file';
    };

    const allFiles = [
      ...directFiles.map(f => ({
        attachmentUrl: f.attachmentUrl,
        category: 'direct',
        fileType: detectFileType(f.attachmentUrl),
        senderName: `${f.senderId?.prenom || ''} ${f.senderId?.nom || ''}`.trim(),
        timestamp: f.timestamp,
      })),
      ...channelFiles.map(f => ({
        attachmentUrl: f.attachmentUrl,
        category: 'channel',
        fileType: detectFileType(f.attachmentUrl),
        channelName: channelIdToName[f.channelId.toString()] || 'Inconnu',
        timestamp: f.createdAt,
      })),
    ];

    res.json(allFiles);
  } catch (err) {
    console.error('❌ Erreur récupération documents :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

//Obtenir les infos publiques d’un utilisateur (nom, email, statut)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('prenom nom email status');
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    res.json(user);
  } catch (err) {
    console.error('❌ Erreur récupération utilisateur par ID :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});



module.exports = router;