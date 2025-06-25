const express = require('express');
const router = express.Router();
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// 🔐 Middleware d’authentification
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

//rejoindre un worksapce
router.post('/:id/join', requireAuth, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace || workspace.isPrivate) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    if (!workspace.members.includes(req.userId)) {
      workspace.members.push(req.userId);
      await workspace.save();
    }

    res.json({ message: 'Vous avez rejoint le workspace', workspace });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ Créer un workspace
router.post('/', requireAuth, async (req, res) => {
  const { name, description, isPrivate } = req.body;

  try {
    const workspace = await Workspace.create({
      name,
      description,
      isPrivate,
      createdBy: req.userId,
      members: [req.userId],
    });
    res.status(201).json(workspace);
  } catch (err) {
    res.status(500).json({ error: 'Erreur création workspace' });
  }
});

// ✅ Récupérer tous les workspaces de l'utilisateur
router.get('/', requireAuth, async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      $or: [
        { isPrivate: false },
        { members: req.userId }
      ]
    }).populate('members createdBy');

    res.status(200).json(workspaces);
  } catch (err) {
    res.status(500).json({ error: 'Erreur récupération des workspaces' });
  }
});


// ✅ Récupérer un workspace spécifique (détail)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('createdBy', '_id prenom nom email')
      .populate('members', '_id prenom nom email');

    if (!workspace) return res.status(404).json({ error: 'Workspace introuvable' });

    res.json(workspace);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur récupération workspace' });
  }
});

// ✅ Modifier un workspace
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const updated = await Workspace.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.userId },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Non trouvé ou non autorisé' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erreur mise à jour workspace' });
  }
});

// ✅ Supprimer un workspace
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await Workspace.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.userId,
    });
    if (!deleted) return res.status(404).json({ error: 'Non trouvé ou non autorisé' });
    res.json({ message: 'Workspace supprimé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur suppression workspace' });
  }
});

// ✅ Ajouter un membre par email
router.post('/:id/members-by-email', requireAuth, async (req, res) => {
  const { email } = req.body;


  try {
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ error: 'Workspace non trouvé' });

    if (!workspace.createdBy.equals(req.userId)) {
      return res.status(403).json({ error: 'Non autorisé à modifier ce workspace' });
    }

    if (!workspace.members.includes(userToAdd._id)) {
      workspace.members.push(userToAdd._id);
      await workspace.save();
    }

    res.json(workspace);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de l’ajout du membre' });
  }
});

// ✅ Voir les membres d’un workspace
router.get('/:id/members', requireAuth, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id).populate('members', 'prenom nom email');
    if (!workspace) return res.status(404).json({ error: 'Workspace introuvable' });

    res.json(workspace.members);
  } catch (err) {
    res.status(500).json({ error: 'Erreur récupération membres' });
  }
});

// ✅ Montage des routes channels
const channelRoutes = require('./channel.routes');
router.use('/:workspaceId/channels', channelRoutes);

// ✅ Supprimer un membre du workspace
router.delete('/:id/members/:userId', requireAuth, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ error: 'Workspace non trouvé' });

    if (!workspace.createdBy.equals(req.userId)) {
      return res.status(403).json({ error: 'Non autorisé à modifier ce workspace' });
    }

    const memberId = req.params.userId;
    workspace.members = workspace.members.filter((m) => m.toString() !== memberId);
    await workspace.save();

    const io = req.app.get('io');
    if (io) {
      // Informer le membre retiré
      io.to(memberId).emit('workspace_member_removed', {
        workspaceId: workspace._id.toString(),
        userId: memberId,
      });

      // Informer tous les membres du workspace
      io.to(workspace._id.toString()).emit('workspace_member_removed', {
        workspaceId: workspace._id.toString(),
        userId: memberId,
      });
    }

    const populated = await Workspace.findById(workspace._id).populate('members', 'prenom nom email');
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur suppression membre' });
  }
});
// route suppression channel

module.exports = router;