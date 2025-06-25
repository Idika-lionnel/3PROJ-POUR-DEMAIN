const express = require('express');
const passport = require('passport');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  register,
  login,
  getMe,
  googleMobileLogin,
  googleRedirect,
  githubRedirect
} = require('../controllers/auth.controller');

// 📥 Inscription
router.post('/register', register);

// 🔑 Connexion classique
router.post('/login', login);

// 👤 Récupération utilisateur connecté (JWT)
router.get('/me', authMiddleware.authenticateToken, getMe);

// 📱 Connexion mobile Google
router.get('/google/mobile', googleMobileLogin);

// 🌐 Google OAuth2 (web)
router.get('/google', (req, res, next) => {
  const redirect_uri = req.query.redirect_uri;
  const state = Buffer.from(JSON.stringify({ redirect_uri })).toString('base64');
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
  })(req, res, next);
});
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  googleRedirect
);

// 🐙 GitHub OAuth2 (web)
router.get('/github', (req, res, next) => {
  const redirect_uri = req.query.redirect_uri;
  const state = Buffer.from(JSON.stringify({ redirect_uri })).toString('base64');
  passport.authenticate('github', {
    scope: ['user:email'],
    state,
  })(req, res, next);
});
router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/' }),
  githubRedirect
);

module.exports = router;