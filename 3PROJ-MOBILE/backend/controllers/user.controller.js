const User = require('../models/User');
const DirectMessage = require('../models/DirectMessage'); // à adapter si tu as d'autres modèles
const ChannelMessage = require('../models/ChannelMessage');
const fs = require('fs');
const path = require('path');

// 👤 Récupérer l'utilisateur connecté
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ user });
  } catch (err) {
    console.error('Erreur getMe :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// 📄 Récupérer tous les fichiers reçus par l'utilisateur
exports.getDocuments = async (req, res) => {
  try {
    const userId = req.user.id;

    // 📥 Fichiers reçus dans les messages directs
    const directFiles = await DirectMessage.find({
      receiverId: userId,
      attachmentUrl: { $exists: true, $ne: '' }
    }).lean();

    directFiles.forEach(file => {
      file.type = 'direct';
    });

    // 📢 Fichiers dans les canaux
    const channelFiles = await ChannelMessage.find({
      attachmentUrl: { $exists: true, $ne: '' }
    })
      .populate('channel', 'name') // pour récupérer le nom du canal
      .lean();

    channelFiles.forEach(file => {
      file.type = 'channel';
      file.channelName = file.channel?.name || 'Canal inconnu';
    });

    // 🗃️ Fusion
    const allFiles = [...directFiles, ...channelFiles];
    res.json({ files: allFiles });

  } catch (err) {
    console.error('Erreur getDocuments :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ✏️ Modifier le profil utilisateur
const bcrypt = require('bcrypt');

exports.updateProfile = async (req, res) => {
  try {
    const { prenom, nom, email, password } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (prenom) user.prenom = prenom;
    if (nom) user.nom = nom;

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists && emailExists._id.toString() !== user._id.toString()) {
        return res.status(400).json({ error: 'Email déjà utilisé' });
      }
      user.email = email;
    }

    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }

    await user.save();

    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.json(updatedUser);
  } catch (err) {
    console.error('Erreur updateProfile :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
// ❌ Supprimer le compte utilisateur
exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: 'Compte supprimé' });
  } catch (err) {
    console.error('Erreur deleteAccount :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// 📤 Exporter les données utilisateur
exports.exportData = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    const messages = await DirectMessage.find({
      $or: [{ sender: user.id }, { receiver: user.id }]
    });

    const data = {
      user,
      messages
    };

    res.json({ data });
  } catch (err) {
    console.error('Erreur exportData :', err);
    res.status(500).json({ error: 'Erreur export' });
  }
};

// 👥 Récupérer tous les utilisateurs (optionnel)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ users });
  } catch (err) {
    console.error('Erreur getAllUsers :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// 🔄 Mettre à jour le statut (online, busy, offline)
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { status },
      { new: true }
    ).select('-password');

    // Émettre le statut mis à jour en temps réel
    const io = req.app.get('io');
    io.emit('user_status_updated', {
      userId: user._id.toString(),
      newStatus: status
    });

    res.json({ user });
  } catch (err) {
    console.error('Erreur updateStatus :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
