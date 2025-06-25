const express = require('express');
const router = express.Router({ mergeParams: true });
const Channel = require('../models/Channel');
const ChannelMessage = require('../models/ChannelMessage');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const auth = require('../middleware/auth');

//  Créer un canal (aucun membre par défaut)
router.post('/', auth, async (req, res) => {
  const { name, description, isPrivate } = req.body;
  const { workspaceId } = req.params;

  if (!name || !workspaceId) {
    return res.status(400).json({ error: 'Nom ou workspace manquant' });
  }

  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ error: 'Workspace introuvable' });

    const channel = await Channel.create({
      name,
      description,
      isPrivate,
      workspace: workspaceId,
      createdBy: req.user._id,
      members: [req.user._id],
    });

    res.status(201).json(channel);
  } catch (err) {
    console.error('Erreur création canal :', err);
    res.status(500).json({ error: 'Erreur création canal' });
  }
});


// 📄 Lister les canaux visibles d’un workspace
router.get('/', auth, async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user._id;

  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ error: 'Workspace introuvable' });

    const isWorkspaceMember = workspace.members.some(m => String(m) === String(userId));

    const allChannels = await Channel.find({ workspace: workspaceId }).populate('members', '_id prenom nom');

    const visibleChannels = allChannels.filter(channel => {
      const isPublic = channel.isPrivate === false;
      const isChannelMember = channel.members.some(m => String(m._id) === String(userId));
      return isPublic || (isWorkspaceMember && isChannelMember);
    });

    res.json(visibleChannels);
  } catch (err) {
    console.error('Erreur chargement canaux :', err);
    res.status(500).json({ error: 'Erreur chargement canaux' });
  }
});


// 📄 Obtenir un canal spécifique (si membre)
router.get('/:channelId', auth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId).populate('members', '_id prenom nom');
    if (!channel) return res.status(404).json({ error: 'Canal introuvable' });

    const isMember = channel.members.some(m => m._id.equals(req.user._id));

    // ✅ Si le canal est privé, on bloque les non-membres
    if (channel.isPrivate && !isMember) {
      return res.status(403).json({ error: 'Accès interdit à ce canal privé' });
    }

    // ✅ Sinon (public ou membre), on autorise
    res.json(channel);
  } catch (err) {
    res.status(500).json({ error: 'Erreur récupération canal' });
  }
});


// 📄 Messages du canal (si membre)
router.get('/:channelId/messages', auth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId).populate('members', '_id');
    if (!channel) return res.status(404).json({ error: 'Canal introuvable' });

    const workspace = await Workspace.findById(channel.workspace);
    if (!workspace) return res.status(404).json({ error: 'Workspace introuvable' });

    const isWorkspaceMember = workspace.members.some(m => String(m) === String(req.user._id));
    const isChannelMember = channel.members.some(m => String(m._id) === String(req.user._id));

    if (!isWorkspaceMember && workspace.isPrivate) {
      return res.status(403).json({ error: 'Ce workspace est privé, vous devez le rejoindre' });
    }

    if (channel.isPrivate && !isChannelMember) {
      return res.status(403).json({ error: 'Ce canal est privé, vous n’êtes pas membre' });
    }

    const messages = await ChannelMessage.find({ channelId: req.params.channelId })
        .populate('reactions.userId', 'prenom nom');

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Erreur récupération messages' });
  }
});

// ➕ Poster un message (si membre)
router.post('/:channelId/messages', auth, async (req, res) => {
  const { content } = req.body;
  try {
    const channel = await Channel.findById(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Canal introuvable' });

    const isMember = channel.members.some(m => m.equals(req.user._id));
    if (!isMember) return res.status(403).json({ error: 'Non autorisé à poster ici' });

    const message = await ChannelMessage.create({
      channelId: req.params.channelId,
      senderId: req.user._id,
      senderName: `${req.user.prenom} ${req.user.nom}`,
      content,
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Erreur envoi message' });
  }
});

// ✅ Ajout d’un membre au canal (via email) avec vérification de membre du workspace
router.post('/:channelId/members-by-email', auth, async (req, res) => {
  const { email } = req.body;
  const { channelId } = req.params;

  if (!email) return res.status(400).json({ error: 'Email requis' });

  try {
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: 'Canal introuvable' });

    // Seul le créateur du canal peut ajouter
    if (String(channel.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Seul le créateur peut ajouter des membres' });
    }

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ error: 'Utilisateur introuvable' });

    // 🛑 Vérifier que le user est membre du workspace
    const workspace = await Workspace.findById(channel.workspace);
    const isWorkspaceMember = workspace.members.some(memberId =>
        String(memberId) === String(userToAdd._id)
    );
    if (!isWorkspaceMember) {
      return res.status(400).json({ error: 'Cet utilisateur ne fait pas partie du workspace' });
    }

    // Vérifier s’il est déjà dans le canal
    if (channel.members.includes(userToAdd._id)) {
      return res.status(400).json({ error: 'Utilisateur déjà membre du canal' });
    }

    channel.members.push(userToAdd._id);
    await channel.save();

    // Renvoyer les membres mis à jour
    const updatedChannel = await Channel.findById(channelId).populate('members', '_id prenom nom email');
    res.json(updatedChannel);
  } catch (err) {
    console.error('Erreur ajout membre canal :', err);
    res.status(500).json({ error: 'Erreur ajout membre canal' });
  }
});

// ❌ Suppression d’un membre du canal
router.delete('/:channelId/members/:userId', auth, async (req, res) => {
  const { channelId, userId } = req.params;

  try {
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: 'Canal introuvable' });

    if (String(channel.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Seul le créateur peut retirer des membres' });
    }

    if (String(req.user._id) === String(userId)) {
      return res.status(400).json({ error: 'Le créateur ne peut pas se retirer lui-même' });
    }

    channel.members = channel.members.filter(id => String(id) !== String(userId));
    await channel.save();

    res.json(channel);
  } catch (err) {
    console.error('Erreur suppression membre canal :', err);
    res.status(500).json({ error: 'Erreur suppression membre canal' });
  }
});

// 📄 Lister les membres du canal
router.get('/:channelId/members', auth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId).populate('members', '_id prenom nom email');
    if (!channel) return res.status(404).json({ error: 'Canal introuvable' });

    res.json(channel.members);
  } catch (err) {
    res.status(500).json({ error: 'Erreur chargement membres canal' });
  }
});
//ajouter réaction emojis
router.post('/reaction/:messageId', auth, async (req, res) => {
  const { emoji } = req.body;
  const { messageId } = req.params;
  const user = req.user;

  if (!emoji || !messageId) {
    return res.status(400).json({ error: 'Emoji et messageId requis' });
  }

  try {
    const message = await ChannelMessage.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message introuvable' });

    const alreadyReacted = message.reactions.some(
        (r) =>
            String(r.userId) === String(user._id) && r.emoji === emoji
    );

// Cas 1 : clic 2x sur le même emoji → suppression
    if (alreadyReacted) {
      message.reactions = message.reactions.filter(
          (r) =>
              String(r.userId) !== String(user._id) || r.emoji !== emoji
      );

      await message.save();

      req.app.get("io").emit("channel_reaction_removed", {
        messageId,
        userId: user._id
      });

      return res.status(200).json({ success: true, removed: true });
    }

// Cas 2 : clic sur un emoji nouveau → on remplace la réaction
    message.reactions = message.reactions.filter(
        (r) => String(r.userId) !== String(user._id)
    );

    message.reactions.push({ userId: user._id, emoji });

    await message.save();

    const fullUser = await User.findById(user._id).select('prenom nom');
    req.app.get("io").emit("channel_reaction_updated", {
      messageId,
      emoji,
      user: {
        _id: fullUser._id,
        prenom: fullUser.prenom,
        nom: fullUser.nom
      }
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Erreur ajout réaction :", err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// retirer reaction emojis
router.delete('/reaction/:messageId', auth, async (req, res) => {
  const { messageId } = req.params;
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ error: 'userId requis' });

  try {
    const message = await ChannelMessage.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message introuvable' });

    message.reactions = message.reactions.filter(
        r => String(r.userId) !== String(userId)
    );

    await message.save();

    req.app.get("io").emit("channel_reaction_removed", {
      messageId,
      userId,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Erreur suppression réaction :", err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
//  Route pour compter les messages non lus par canal pour un utilisateur
router.get('/unread-count/:userId', auth, async (req, res) => {
  const userId = req.params.userId;

  try {
    const allChannels = await Channel.find({ members: userId });
    const result = {};

    for (const channel of allChannels) {
      const unreadCount = await ChannelMessage.countDocuments({
        channelId: channel._id,
        senderId: { $ne: userId },
        readBy: { $ne: userId }
      });

      result[channel._id] = unreadCount;
    }

    res.json(result);
  } catch (err) {
    console.error('Erreur récupération unread count :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PATCH /channels/:channelId/mark-as-read
router.patch('/:channelId/mark-as-read', auth, async (req, res) => {
  const { userId } = req.body;
  const { channelId } = req.params;

  if (!userId) return res.status(400).json({ error: 'userId requis' });

  try {
    const updated = await ChannelMessage.updateMany(
        {
          channelId,
          readBy: { $ne: userId }, // si pas déjà lu
        },
        { $push: { readBy: userId } }
    );

    res.json({ updatedCount: updated.modifiedCount });
  } catch (err) {
    console.error('Erreur mark-as-read :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
// 🔄 Modifier un canal (nom, description, visibilité)
router.patch('/:channelId', auth, async (req, res) => {
  const { name, description, isPrivate } = req.body;
  const { channelId } = req.params;

  try {
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: 'Canal introuvable' });

    // Seul le créateur peut modifier
    if (String(channel.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Seul le créateur peut modifier ce canal' });
    }

    if (name !== undefined) channel.name = name;
    if (description !== undefined) channel.description = description;
    if (isPrivate !== undefined) channel.isPrivate = isPrivate;

    await channel.save();
    res.json(channel);
  } catch (err) {
    console.error('Erreur modification canal :', err);
    res.status(500).json({ error: 'Erreur serveur lors de la modification' });
  }
});
// 🗑 Supprimer un canal
router.delete('/:channelId', auth, async (req, res) => {
  const { channelId } = req.params;

  try {
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: 'Canal introuvable' });

    if (String(channel.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Seul le créateur peut supprimer ce canal' });
    }

    const workspaceId = channel.workspace; // ✅ On récupère le workspace ici

    // Supprimer les messages du canal
    await ChannelMessage.deleteMany({ channelId });

    // Supprimer le canal
    await Channel.findByIdAndDelete(channelId);

    // ✅ Vérifier s’il reste des canaux dans ce workspace
    const remaining = await Channel.find({ workspace: workspaceId });

    if (remaining.length === 0) {
      // ✅ Recréer un canal par défaut
      const defaultChannel = await Channel.create({
        name: 'général',
        description: 'Canal par défaut recréé automatiquement',
        isPrivate: false,
        workspace: workspaceId,
        createdBy: req.user._id,
        members: [req.user._id],
      });

      return res.json({ success: true, fallbackChannelId: defaultChannel._id });
    }else {
      // ✅ renvoyer un canal existant pour redirection
      return res.json({ success: true, nextChannelId: remaining[0]._id });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur suppression canal :', err);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
  }
});




module.exports = router;