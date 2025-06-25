const jwt = require('jsonwebtoken');

// Middleware pour authentifier les utilisateurs via JWT
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Vérifie si un token est présent dans l'en-tête Authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accès refusé : token manquant.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Vérifie et décode le token avec la clé secrète
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // On attache les infos du user à la requête
    req.user = decoded;       // Pour accéder à ._id, .prenom, .role, etc.
    req.userId = decoded._id; // Pour compatibilité avec d’autres fonctions

    next();
  } catch (err) {
    console.error('❌ Erreur d’authentification :', err);
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
};

module.exports = requireAuth;