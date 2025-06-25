const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const DirectMessage = require('./models/DirectMessage');
const Conversation = require('./models/Conversation');
require('dotenv').config();

// 📦 Import des routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const conversationRoutes = require('./routes/conversation.routes');
const messageRoutes = require('./routes/message.routes');
const ChannelMessage = require('./models/ChannelMessage');
const workspaceRoutes = require('./routes/workspace.routes');
const channelRoutes = require('./routes/channel.routes');
const mentionRoutes = require('./routes/mention.routes');
// 🚀 App init
const app = express();

// 🌍 Middlewares globaux
app.use(cors());
app.use(express.json());

// 🛡️ Session & Passport (OAuth2)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'defaultsecret',
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// 📁 Fichiers statiques
app.use('/uploads', express.static('uploads'));

// 🧭 Routes API
app.use('/api/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/mentions', require('./routes/mention.routes'));

// 🛢️ MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connecté'))
  .catch((err) => console.error('❌ Erreur MongoDB :', err));

// 🔌 Serveur HTTP + Socket.io
const PORT = process.env.PORT || 5050;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// 📌 Fonction pour mettre à jour la conversation
async function updateConversation(senderId, receiverId, lastMsg) {
  let conv = await Conversation.findOne({
    participants: { $all: [senderId, receiverId], $size: 2 }
  });

  const hour = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!conv) {
    await Conversation.create({
      participants: [senderId, receiverId],
      lastMessage: lastMsg,
      lastHour: hour,
      updatedAt: new Date()
    });
  } else {
    await Conversation.updateOne(
      { _id: conv._id },
      {
        $set: {
          lastMessage: lastMsg,
          lastHour: hour,
          updatedAt: new Date()
        }
      }
    );
  }
}

// 💬 Socket.io
io.on('connection', (socket) => {
  console.log('✅ Client connecté via Socket.io');


   // ✅ Ajout d'un membre au canal
   socket.on('channel_member_added', ({ channelId, member }) => {
     io.to(channelId).emit('channel_member_added', { channelId, member });
   });

   // ✅ Suppression d’un membre
   socket.on('channel_member_removed', ({ channelId, userId }) => {
     io.to(channelId).emit('channel_member_removed', { channelId, userId });
   });


  // ✅ Rejoindre sa room perso
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`🟢 L'utilisateur ${userId} a rejoint sa room`);
    }
  });
  // ✅ Rejoindre un workspace
  socket.on('join_workspace', (workspaceId) => {
    if (workspaceId) {
      socket.join(workspaceId);
      console.log(`🏢 Socket rejoint le workspace ${workspaceId}`);
    }
  });

  // ✅ Rejoindre un canal
  socket.on('join_channel', (channelId) => {
    if (channelId) {
      socket.join(channelId);
      console.log(`📡 Socket rejoint le canal ${channelId}`);
    }
  });

  // ✅ Message direct
  socket.on('direct_message', async (msg) => {
    try {
      if (!msg.senderId || !msg.receiverId) return console.warn('❌ senderId ou receiverId manquant');

      if (msg.attachmentUrl && msg.type === 'file') {
        await updateConversation(
          msg.senderId,
          msg.receiverId,
          msg.attachmentUrl.split('/').pop() || '[Fichier]'
        );

        io.to(msg.receiverId).emit('new_direct_message', msg);
        io.to(msg.senderId).emit('new_direct_message', msg);
        return;
      }

      const savedMessage = await DirectMessage.create({
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        message: msg.message,
        attachmentUrl: '',
        type: 'text',
        timestamp: new Date(),
        read: false,
      });

      await updateConversation(msg.senderId, msg.receiverId, msg.message);
      io.to(msg.receiverId).emit('new_direct_message', savedMessage);
      io.to(msg.senderId).emit('new_direct_message', savedMessage);
      console.log(`📤 Message direct ${savedMessage.type} envoyé à ${msg.receiverId}`);
    } catch (err) {
      console.error('❌ Erreur direct_message :', err);
    }
  });

  // ✅ Réactions directes
  socket.on('reaction_updated', ({ messageId, userId, emoji }) => {
    console.log(`🔄 Réaction MAJ sur message ${messageId} par ${userId}`);
    io.emit('reaction_updated', { messageId, userId, emoji });
  });

  socket.on('reaction_removed', ({ messageId, userId }) => {
    console.log(`❌ Réaction supprimée sur message ${messageId} par ${userId}`);
    io.emit('reaction_removed', { messageId, userId });
  });
  // Messsages canaux
  socket.on('channel_message', async (msg) => {
    try {
      const { channelId, senderId, content, attachmentUrl, type } = msg;

      if (!channelId || !senderId) {
        return console.warn('❌ channelId ou senderId manquant');
      }

      const newMessage = await ChannelMessage.create({
        channel: channelId,
        senderId,
        content: type === 'text' ? content : '',
        attachmentUrl: type === 'file' ? attachmentUrl : '',
        type,
      });

      // ✅ Peupler l’expéditeur (indispensable pour React Native)
      const fullMessage = await ChannelMessage.findById(newMessage._id).populate('senderId', 'prenom nom');

      // ✅ Envoyer l’objet peuplé (pas brut)
      io.to(channelId).emit('new_channel_message', fullMessage.toObject());

      console.log(`📤 Nouveau message ${type} envoyé à ${channelId}`);
    } catch (err) {
      console.error('❌ Erreur channel_message :', err);
    }
  });


  // ✅ Réactions dans canaux
  socket.on('channel_reaction_updated', ({ messageId, emoji, user }) => {
    if (!user || !user._id) return; // ne rien faire si pas de user

    setMessages(prev =>
      prev.map(msg =>
        msg._id === messageId
          ? {
              ...msg,
              reactions: [
                ...(msg.reactions || []).filter(r => r.user?._id !== user._id),
                { user, emoji }
              ]
            }
          : msg
      )
    );
  });

  socket.on('channel_reaction_removed', ({ messageId, userId, channelId }) => {
    console.log(`❌ Réaction supprimée dans canal ${channelId} sur message ${messageId} par ${userId}`);
    io.to(channelId).emit('channel_reaction_removed', { messageId, userId });
  });

  socket.on('disconnect', () => {
    console.log('❌ Client déconnecté');
  });
});

// 👂 Attacher io à l'app
app.set('io', io);

const os = require('os');
const networkInterfaces = os.networkInterfaces();
const localIP = Object.values(networkInterfaces)
  .flat()
  .find((iface) => iface.family === 'IPv4' && !iface.internal).address;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Serveur démarré sur http://${localIP}:${PORT}`);
});