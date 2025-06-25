const express = require('express');
const router = express.Router();
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const requireAuth = require('../middleware/auth'); // 🔐 middleware centralisé
const Channel = require('../models/Channel');

// ✅ Créer un workspace
router.post('/', requireAuth, async (req, res) => {
  const { name, description = '', isPrivate = false } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Le nom est requis' });
  }

  try {
    const workspace = await Workspace.create({
      name,
      description,
      isPrivate,
      createdBy: req.user._id,
      members: [req.user._id],
    });
    // ✅ Créer un canal par défaut
    await Channel.create({
      name: 'général',
      description: "Canal par défaut du workspace",
      isPrivate: false,
      workspace: workspace._id,
      createdBy: req.user._id,
      members: [req.user._id],
    });

    res.status(201).json(workspace);
  } catch (err) {
    console.error('❌ Erreur création workspace :', err);
    res.status(500).json({ error: 'Erreur création workspace' });
  }
});

// ✅ Récupérer tous les workspaces de l'utilisateur
router.get('/', requireAuth, async (req, res) => {
  try {
    const workspaces = await Workspace.find({ members: req.user._id });
    res.status(200).json(workspaces);
  } catch (err) {
    console.error('❌ Erreur récupération workspaces :', err);
    res.status(500).json({ error: 'Erreur récupération des workspaces' });
  }
});

// ✅ Récupérer un workspace précis avec createdBy et membres
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('createdBy', '_id prenom nom email')
      .populate('members', '_id prenom nom email');

    if (!workspace) return res.status(404).json({ error: 'Workspace introuvable' });

    res.json(workspace);
  } catch (err) {
    console.error('❌ Erreur récupération workspace :', err);
    res.status(500).json({ error: 'Erreur récupération workspace' });
  }
});

// ✅ Modifier un workspace (seul le créateur peut le faire)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const updated = await Workspace.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Non trouvé ou non autorisé' });

    res.json(updated);
  } catch (err) {
    console.error('❌ Erreur mise à jour workspace :', err);
    res.status(500).json({ error: 'Erreur mise à jour workspace' });
  }
});

// ✅ Supprimer un workspace (seul le créateur peut le faire)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await Workspace.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!deleted) return res.status(404).json({ error: 'Non trouvé ou non autorisé' });

    res.json({ message: 'Workspace supprimé' });
  } catch (err) {
    console.error('❌ Erreur suppression workspace :', err);
    res.status(500).json({ error: 'Erreur suppression workspace' });
  }
});

// ✅ Ajouter un membre par email (seul le créateur peut le faire)
router.post('/:id/members-by-email', requireAuth, async (req, res) => {
  const { email } = req.body;

  try {
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ error: 'Workspace non trouvé' });

    if (!workspace.createdBy.equals(req.user._id)) {
      return res.status(403).json({ error: 'Non autorisé à modifier ce workspace' });
    }

    if (!workspace.members.includes(userToAdd._id)) {
      workspace.members.push(userToAdd._id);
      await workspace.save();
    }

    // re-populate pour voir les membres mis à jour
    const updated = await Workspace.findById(req.params.id)
      .populate('createdBy', '_id prenom nom email')
      .populate('members', '_id prenom nom email');

    res.json(updated);
  } catch (err) {
    console.error('❌ Erreur ajout membre :', err);
    res.status(500).json({ error: 'Erreur lors de l’ajout du membre' });
  }
});

// ✅ Voir les membres d’un workspace
router.get('/:id/members', requireAuth, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('members', 'prenom nom email');
    if (!workspace) return res.status(404).json({ error: 'Workspace introuvable' });

    res.json(workspace.members);
  } catch (err) {
    console.error('❌ Erreur récupération membres :', err);
    res.status(500).json({ error: 'Erreur récupération membres' });
  }
});

// ✅ Supprimer un membre (seul le créateur peut le faire)
router.delete('/:id/members/:userId', requireAuth, async (req, res) => {
  const workspaceId = req.params.id;
  const memberId = req.params.userId;

  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ error: 'Workspace introuvable' });

    if (!workspace.createdBy.equals(req.user._id)) {
      return res.status(403).json({ error: 'Non autorisé à modifier ce workspace' });
    }

    workspace.members = workspace.members.filter(
      (m) => String(m) !== String(memberId)
    );
    await workspace.save();

    const updated = await Workspace.findById(workspaceId)
      .populate('createdBy', '_id prenom nom email')
      .populate('members', '_id prenom nom email');

    res.json(updated);
  } catch (err) {
    console.error('❌ Erreur suppression membre :', err);
    res.status(500).json({ error: 'Erreur suppression membre' });
  }
});

// Rejoindre un workspace public
router.patch('/:id/join', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const workspace = await Workspace.findById(id);
    if (!workspace) return res.status(404).json({ error: 'Workspace introuvable' });

    if (workspace.isPrivate) {
      return res.status(403).json({ error: 'Ce workspace est privé.' });
    }

    if (!workspace.members.includes(userId)) {
      workspace.members.push(userId);
      await workspace.save();
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Erreur rejoindre workspace :", err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
// Voir tous les workspaces publics accessibles (même si on n’est pas membre)
router.get('/public/all', requireAuth, async (req, res) => {
  try {
    const publicWorkspaces = await Workspace.find({ isPrivate: false });
    res.status(200).json(publicWorkspaces);
  } catch (err) {
    console.error('Erreur récupération workspaces publics :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


module.exports = router;