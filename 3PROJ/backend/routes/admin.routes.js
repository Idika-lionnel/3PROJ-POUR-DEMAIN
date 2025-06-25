const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware d'autorisation admin
function isAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

// 🔒 Autorisation + vérification du rôle
const requireAdmin = async (req, res, next) => {
  await isAdmin(req, res, async () => {
    const user = await User.findById(req.user.id);
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux admins' });
    }
    next();
  });
};

// 🧾 GET /admin/users → Liste des utilisateurs
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('_id email prenom nom role');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 🔄 PATCH /admin/users/:id/role → Modifier le rôle
router.patch('/users/:id/role', requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'membre', 'developpeur'].includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }

  try {
    await User.findByIdAndUpdate(req.params.id, { role });
    res.json({ message: 'Rôle mis à jour' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;