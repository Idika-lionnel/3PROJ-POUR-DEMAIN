const jwt = require('jsonwebtoken');
const User = require('../models/User'); // ✅ à ne pas oublier

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('_id prenom nom email status');
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur introuvable' });
    }

    req.user = user;
    req.userId = user._id;

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};
