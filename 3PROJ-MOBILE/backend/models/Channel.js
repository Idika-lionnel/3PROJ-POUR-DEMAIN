const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPrivate: { type: Boolean, default: false }, // 👈 Ajout du champ
}, { timestamps: true });

module.exports = mongoose.model('Channel', channelSchema);
