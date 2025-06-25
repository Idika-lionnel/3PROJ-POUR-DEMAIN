const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true, // 👉 empêche l'enregistrement sans email
    lowercase: true, // 👉 garantit la cohérence (utile pour les recherches)
    trim: true
  },
  prenom: {
    type: String,
    required: true,
    trim: true
  },
  nom: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'membre', 'developpeur'],
    default: 'membre'
  },
  status: {
    type: String,
    enum: ['online', 'busy', 'offline'],
    default: 'online',
  }
}, { timestamps: true }); // 👉 ajoute createdAt / updatedAt

module.exports = mongoose.model('User', userSchema);