const express = require('express');
const router = express.Router({ mergeParams: true });
const Channel = require('../models/Channel');
const Workspace = require('../models/Workspace');
const ChannelMessage = require('../models/ChannelMessage');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SERVER_URL = process.env.SERVER_URL || `http://localhost:5051`;


// 📦 Pour upload de fichiers
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 📁 Configuration multer
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

// ✅ Middleware d’authentification
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { _id: decoded.id };
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

// ✅ Créer un canal dans un workspace
router.post('/', requireAuth, async (req, res) => {
  const { name, description, isPrivate } = req.body;
  const { workspaceId } = req.params;

  if (!name || !workspaceId) {
    return res.status(400).json({ error: 'Nom ou workspace manquant' });
  }

  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace introuvable' });
    }

    const channel = await Channel.create({
      name,
      description,
      isPrivate: isPrivate || false,
      workspace: workspaceId,
      createdBy: req.user._id,
      members: [req.user._id], // Le créateur est membre automatiquement
    });

    res.status(201).json(channel);
  } catch (err) {
    console.error('❌ ERREUR SERVER CRÉATION CANAL :', err);
    res.status(500).json({ error: 'Erreur création canal' });
  }
});

// ✅ Récupérer les canaux du workspace
router.get('/', requireAuth, async (req, res) => {
  const { workspaceId } = req.params;

  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID manquant' });
  }

  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace introuvable' });
    }

    // ✅ Vérifie si l'utilisateur est membre
    const isWorkspaceMember = workspace.members.map(id => id.toString()).includes(req.user._id.toString());
    if (!isWorkspaceMember) {
      return res.status(403).json({ error: 'Accès refusé : non membre du workspace' });
    }

    const channels = await Channel.find({
      workspace: workspaceId,
      $or: [
        { members: req.user._id },     // il est membre du canal
        { isPrivate: false },          // ou le canal est public
      ],
    });

    res.status(200).json(channels);
  } catch (err) {
    console.error('❌ ERREUR RÉCUPÉRATION CANAUX :', err);
    res.status(500).json({ error: 'Erreur récupération canaux' });
  }
});


// ✅ Créer un message texte dans un canal
router.post('/:id/messages', requireAuth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id).populate('createdBy', '_id');
    if (!channel) {
      return res.status(404).json({ error: 'Canal introuvable' });
    }

    const userId = req.user._id.toString();
    const isChannelMember = channel.members.some(member => {
      const memberId = member._id ? member._id.toString() : member.toString();
      return memberId === userId;
    });
    const isCreator = channel.createdBy?._id?.toString() === userId;

    if (!isChannelMember && !isCreator) {
      return res.status(403).json({ error: 'Accès interdit : vous n\'êtes pas membre de ce canal' });
    }

    const message = await ChannelMessage.create({
      content: req.body.content || '',
      channel: req.params.id,
      senderId: req.user._id,
    });

    const fullMessage = await ChannelMessage.findById(message._id).populate('senderId', 'prenom nom');


    const io = req.app.get('io');
    io.to(req.params.id).emit('new_channel_message', fullMessage.toObject());


    res.status(201).json(fullMessage);
  } catch (err) {
    console.error('❌ ERREUR ENVOI MESSAGE CANAL :', err);
    res.status(500).json({ error: 'Erreur envoi message' });
  }
});


// ✅ Récupérer tous les messages d’un canal
router.get('/:id/messages', requireAuth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id).populate('createdBy', '_id');
    if (!channel) {
      return res.status(404).json({ error: 'Canal introuvable' });
    }

    const workspace = await Workspace.findById(channel.workspace);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace introuvable' });
    }

    const userId = req.user._id.toString();
    const isWorkspaceMember = workspace.members.map(id => id.toString()).includes(userId);
    const isChannelMember = channel.members.some(member => {
      const memberId = member._id ? member._id.toString() : member.toString();
      return memberId === userId;
    });

    const isCreator = channel.createdBy?._id?.toString() === userId;

    // 🔒 Vérifie les droits d'accès
    if (!isWorkspaceMember) {
      return res.status(403).json({ error: 'Accès refusé (non membre du workspace)' });
    }


    if (channel.isPrivate && !isChannelMember && !isCreator) {
      return res.status(403).json({ error: 'Accès refusé (canal privé)' });
    }

    // ✅ Accès autorisé
    const messages = await ChannelMessage.find({ channel: req.params.id })
      .sort({ createdAt: 1 })
      .populate('senderId', 'prenom nom')
      .populate('reactions.userId', 'prenom nom');

    res.status(200).json(messages);
  } catch (err) {
    console.error('❌ ERREUR RÉCUP MESSAGES CANAL :', err);
    res.status(500).json({ error: 'Erreur récupération messages' });
  }
});

// 📤 Envoi de fichier dans un canal
router.post(
  '/upload/channel/:channelId',
  requireAuth,
  upload.single('file'),
  async (req, res) => {
    console.log('📥 Requête upload reçue');

    const channel = await Channel.findById(req.params.channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Canal introuvable' });
    }

    const userId = req.user._id.toString();
    const isChannelMember = channel.members.map((id) => id.toString()).includes(userId);
    const isCreator = channel.createdBy?.toString() === userId;

    if (!isChannelMember && !isCreator) {
      return res.status(403).json({ error: 'Accès interdit : vous n\'êtes pas membre de ce canal' });
    }

    if (!req.file) {
      console.log('❌ Aucun fichier reçu');
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }

    const createdMessage = await ChannelMessage.create({
      senderId: req.user._id,
      channel: req.params.channelId,
      attachmentUrl: `${SERVER_URL}/uploads/${req.file.filename}`,

      type: 'file',
      content: '',
    });

    const fullMessage = await ChannelMessage.findById(createdMessage._id).populate('senderId', 'prenom nom');

    const io = req.app.get('io');
    io.to(req.params.channelId).emit('new_channel_message', fullMessage);

    res.status(200).json(fullMessage);
  }
);


//  Récupérer un canal par son ID
// ✅ Récupérer un canal par son ID (corrigé)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
      .populate('members', 'prenom nom email')
      .populate('createdBy', '_id prenom nom email')
      .populate('workspace'); // ✅ on ne tente plus de populate `workspace.channels`

    if (!channel) {
      return res.status(404).json({ error: 'Canal introuvable' });
    }

    const workspace = await Workspace.findById(channel.workspace);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace introuvable' });
    }

    const userId = req.user._id.toString();
    const isWorkspaceMember = workspace.members.map(id => id.toString()).includes(userId);
    const isChannelMember = channel.members.some(member => {
      const memberId = member._id ? member._id.toString() : member.toString();
      return memberId === userId;
    });
    const isCreator = channel.createdBy?._id?.toString() === userId;

    if (!isWorkspaceMember) {
      return res.status(403).json({ error: 'Accès interdit (non membre du workspace)' });
    }

    if (channel.isPrivate && !isChannelMember && !isCreator) {
      return res.status(403).json({ error: 'Accès interdit (canal privé)' });
    }

    // ✅ On récupère manuellement tous les canaux du workspace pour le hashtag
    const workspaceChannels = await Channel.find({ workspace: channel.workspace._id }).select('_id name');

    res.status(200).json({
      ...channel.toObject(),
      isMember: isChannelMember || isCreator,
      isCreator: isCreator,
      workspace: {
        ...channel.workspace.toObject(),
        channels: workspaceChannels, // ✅ ajouté dynamiquement ici
      }
    });
  } catch (err) {
    console.error('❌ ERREUR RÉCUPÉRATION CANAL PAR ID :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ Ajouter ou retirer une réaction sur un message de canal
router.post('/reaction/:messageId', requireAuth, async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user._id.toString();

  if (!emoji) return res.status(400).json({ error: 'Emoji requis' });

  try {
    const message = await ChannelMessage.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message non trouvé' });

    const channel = await Channel.findById(message.channel);
    if (!channel) return res.status(404).json({ error: 'Canal non trouvé' });

    const isMember = channel.members.some(member => {
      const memberId = member._id ? member._id.toString() : member.toString();
      return memberId === userId;
    });

    const isCreator = channel.createdBy?.toString() === userId;

    if (!isMember && !isCreator) {
      return res.status(403).json({ error: 'Accès interdit à ce canal' });
    }

    const existing = message.reactions.find(r => r.userId.toString() === userId);

    if (existing) {
      if (existing.emoji === emoji) {
        // Retirer la réaction
        message.reactions = message.reactions.filter(r => r.userId.toString() !== userId);
        await message.save();

        const io = req.app.get('io');
        io.to(message.channel.toString()).emit('channel_reaction_removed', {
          messageId,
          userId,
          channelId: message.channel.toString()
        });

        return res.status(200).json({ message: 'Réaction supprimée' });
      } else {
        // Modifier la réaction
        existing.emoji = emoji;
        await message.save();

        const io = req.app.get('io');
        const populatedUser = await User.findById(userId).select('prenom nom');
        io.to(message.channel.toString()).emit('channel_reaction_updated', {
          messageId,
          emoji,
          channelId: message.channel.toString(),
          user: populatedUser // 👈 envoyé directement
        });

        return res.status(200).json({ message: 'Réaction modifiée' });
      }
    } else {
      // Ajouter une réaction
      message.reactions.push({ userId, emoji });
      await message.save();

      const io = req.app.get('io');
      const populatedUser = await User.findById(userId).select('prenom nom');

      io.to(message.channel.toString()).emit('channel_reaction_updated', {
        messageId,
        emoji,
        channelId: message.channel.toString(),
        user: populatedUser // 👈 envoyé directement
      });

      return res.status(200).json({ message: 'Réaction ajoutée' });
    }
  } catch (err) {
    console.error('❌ Erreur ajout/rétractation réaction canal :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


//route invitation channels
router.post('/:id/invite', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;
  const currentUserId = req.user._id;

  try {
    const channel = await Channel.findById(id);
    if (!channel) return res.status(404).json({ error: 'Canal non trouvé' });

    // ⚠️ Vérifie que le créateur du canal invite
    if (!channel.createdBy || channel.createdBy.toString() !== currentUserId.toString()) {
      return res.status(403).json({ error: 'Seul le créateur peut inviter des membres' });
    }

    const invitedUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (!invitedUser) return res.status(404).json({ error: 'Utilisateur introuvable' });

    if (channel.members.some(id => id.toString() === invitedUser._id.toString())) {
      return res.status(400).json({ error: 'Cet utilisateur est déjà membre' });
    }

    channel.members.push(invitedUser._id);
    await channel.save();

    res.status(200).json(invitedUser);
  } catch (err) {
    console.error('❌ ERREUR INVITATION CANAL :', err);
    res.status(500).json({ error: 'Erreur serveur lors de l’invitation' });
  }
});

//delete channel member
router.delete('/:channelId/members/:userId', requireAuth, async (req, res) => {
  const { channelId, userId } = req.params;
  const currentUserId = req.user._id;

  try {
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: 'Canal non trouvé' });

    // ✅ Seul le créateur peut retirer un membre
    if (channel.createdBy.toString() !== currentUserId.toString()) {
      return res.status(403).json({ error: 'Seul le créateur peut retirer des membres' });
    }

    // ❌ Ne pas permettre au créateur de se retirer lui-même
    if (userId === currentUserId.toString()) {
      return res.status(400).json({ error: 'Le créateur ne peut pas se retirer lui-même' });
    }

    channel.members = channel.members.filter(id => id.toString() !== userId);
    await channel.save();

    const io = req.app.get('io');
    io.to(channel._id.toString()).emit('channel_member_removed', {
      channelId: channel._id.toString(),
      userId
    });

    // 🔔 Notifie uniquement l’utilisateur retiré
    io.to(userId).emit('removed_from_channel', {
      channelId: channel._id.toString()
    });

    res.status(200).json({ message: 'Membre retiré avec succès' });
  } catch (err) {
    console.error('❌ Erreur retrait membre canal :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});



// ❌ Supprimer une réaction dans un canal
router.delete('/reaction/:messageId', requireAuth, async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  try {
    const message = await ChannelMessage.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message non trouvé' });

    const channel = await Channel.findById(message.channel);
    if (!channel) return res.status(404).json({ error: 'Canal non trouvé' });

    // ✅ Vérifie que l'utilisateur a le droit (est membre ou créateur)
    const isMember =
      channel.members.map(id => id.toString()).includes(userId.toString()) ||
      channel.createdBy.toString() === userId.toString();

    if (!isMember) {
      return res.status(403).json({ error: 'Accès interdit au canal' });
    }

    // ✅ Supprime la réaction de l'utilisateur
    message.reactions = message.reactions.filter(
      r => r.userId.toString() !== userId.toString()
    );
    await message.save();

    const io = req.app.get('io');
    const populatedUser = await User.findById(userId).select('prenom nom');
    io.to(message.channel.toString()).emit('channel_reaction_removed', {
      messageId,
      channelId: message.channel.toString(),
      userId: userId  // uniquement l'ID ici
    });

    res.status(200).json({ message: 'Réaction supprimée avec succès' });
  } catch (err) {
    console.error('❌ Erreur suppression réaction :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }

});

// route modification channels
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ error: 'Canal introuvable' });

    if (!channel.createdBy.equals(req.user._id)) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    channel.name = req.body.name || channel.name;
    channel.description = req.body.description || '';
    channel.isPrivate = req.body.isPrivate ?? channel.isPrivate;

    await channel.save();
    res.json(channel);
  } catch (err) {
    res.status(500).json({ error: 'Erreur mise à jour du canal' });
  }
});

// route pour suppression des channels
router.delete('/:id', requireAuth, async (req, res) => {
  const channel = await Channel.findById(req.params.id);
  if (!channel) return res.status(404).json({ error: 'Canal introuvable' });

  if (!channel.createdBy.equals(req.user._id)) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  await Channel.deleteOne({ _id: req.params.id });
  res.status(200).json({ message: 'Canal supprimé' });
});





module.exports = router;
