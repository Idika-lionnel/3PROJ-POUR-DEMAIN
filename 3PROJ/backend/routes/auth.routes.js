const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');

// 📥 Inscription
router.post('/register', async (req, res) => {
  const { email, prenom, nom, password } = req.body;

  if (!email || !prenom || !nom || !password) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      prenom,
      nom,
      password: hashed,
      role: 'membre'
    });

    res.status(201).json({
      message: 'Utilisateur créé',
      user: {
        _id: user._id,
        email: user.email,
        prenom: user.prenom,
        nom: user.nom,
        role: user.role
      }
    });
  } catch (err) {
    console.error('❌ Erreur inscription :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 🔐 Connexion
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Identifiants invalides' });
    }

    const token = jwt.sign(
      {
        _id: user._id,
        prenom: user.prenom,
        nom: user.nom,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        prenom: user.prenom,
        nom: user.nom,
        role: user.role
      }
    });
  } catch (err) {
    console.error('❌ Erreur login :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 🌐 Google OAuth2
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: 'http://localhost:3000/login' }),
  (req, res) => {
    const user = req.user;
    const token = jwt.sign(
      {
        _id: user._id,
        prenom: user.prenom,
        nom: user.nom,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.redirect(`http://localhost:3000/login?token=${token}`);
  }
);

// 🐙 GitHub OAuth2
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: 'http://localhost:3000/login' }),
  (req, res) => {
    const user = req.user;
    const token = jwt.sign(
      {
        _id: user._id,
        prenom: user.prenom,
        nom: user.nom,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.redirect(`http://localhost:3000/login?token=${token}`);
  }
);

// 👤 Récupération de l'utilisateur connecté
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    res.json({ user });
  } catch (err) {
    console.error('❌ Erreur /me :', err);
    res.status(401).json({ error: 'Token invalide' });
  }
});

module.exports = router;