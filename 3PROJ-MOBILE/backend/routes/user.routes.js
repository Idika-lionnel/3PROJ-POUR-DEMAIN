const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const userController = require('../controllers/user.controller');


// Middleware d'authentification
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id prenom nom email');

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur introuvable' });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    console.error('❌ Erreur d’authentification :', err);
    return res.status(401).json({ error: 'Token invalide ou utilisateur introuvable' });
  }
};

// ✅ Liste des utilisateurs
router.get('/all', requireAuth, userController.getAllUsers);

// ✅ Tous les fichiers accessibles (directs + canaux)
router.get('/documents', requireAuth, userController.getDocuments);

// ✅ Modifier son profil
router.put('/update', requireAuth, userController.updateProfile);
router.put('/status', requireAuth, userController.updateStatus);


// ✅ Supprimer son compte
router.delete('/delete', requireAuth, userController.deleteAccount);

// ✅ Exporter ses données personnelles
router.get('/export', requireAuth, userController.exportData);

// ✅ Obtenir l'utilisateur connecté
router.get('/me', requireAuth, userController.getMe);

module.exports = router;