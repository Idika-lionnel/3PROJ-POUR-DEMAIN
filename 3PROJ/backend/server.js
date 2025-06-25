const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
require("./config/passport");
const path = require("path");
const User = require('./models/User');

// ✅ Autoriser plusieurs origines
const allowedOrigins = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002","http://localhost:3003","http://localhost:3004","http://localhost:3005"];

// ✅ Import des routes
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const workspaceRoutes = require("./routes/workspace.routes");
const userRoutes = require("./routes/user.routes");
const messageRoutes = require("./routes/message.routes");
const conversationRoutes = require("./routes/conversation.routes");
const channelRoutes = require("./routes/channel.routes");
const channelPreviewRoutes = require("./routes/channelPreview.routes");
const mentionRoutes = require('./routes/mentions.routes');
const uploadChannelRoutes = require("./routes/uploadChannel.routes");
const { getWorkspaceIdFromChannel, getChannelName } = require('./utils/utils');

// ✅ Import des modèles
const DirectMessage = require("./models/DirectMessage");
const Conversation = require("./models/Conversation");
const ChannelMessage = require("./models/ChannelMessage");
const ChannelPreview = require('./models/ChannelPreview');

const app = express();

// ➕ Logger de route
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// ➕ Middlewares
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// 📂 Static pour les fichiers
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.set("io", null);

// 🔗 Routes API
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/users", userRoutes);
app.use("/api/users", userRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/workspaces/:workspaceId/channels", channelRoutes);
app.use('/api/upload/channel', uploadChannelRoutes);
app.use("/api/channel-previews", channelPreviewRoutes);
app.use("/api/channels", channelRoutes);
app.use('/api/mentions', mentionRoutes);

// 🔌 Connexion MongoDB + Socket.io
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected");

    const PORT = process.env.PORT || 5050;
    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin: function (origin, callback) {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        },
        credentials: true,
      },
    });

    app.set("io", io);

    io.on("connection", (socket) => {
      console.log("🧠 Nouvelle connexion Socket.io");

      socket.on('identify', (userId) => {
        socket.userId = userId;
      });

      socket.on('user_connected', async ({ userId }) => {
        try {
          await User.findByIdAndUpdate(userId, { status: 'online' });
          socket.broadcast.emit('status_updated', { userId, status: 'online' });
          console.log(` ${userId} est maintenant en ligne`);
        } catch (err) {
          console.error(' Erreur user_connected :', err);
        }
      });

      socket.on('disconnect', async () => {
        if (socket.userId) {
          try {
            await User.findByIdAndUpdate(socket.userId, { status: 'offline' });
            socket.broadcast.emit('status_updated', { userId: socket.userId, status: 'offline' });
            console.log(`🔴 ${socket.userId} est maintenant hors ligne`);
          } catch (err) {
            console.error('❌ Erreur disconnect update status :', err);
          }
        }
      });

      socket.on("join", (userId) => {
        socket.join(userId);
        console.log(`👤 User ${userId} a rejoint sa room`);
      });

      socket.on("direct_message", async (data) => {
        const {
          senderId,
          receiverId,
          message,
          type = "text",
          attachmentUrl = null,
        } = data;

        try {
          const saved = await DirectMessage.create({
            senderId,
            receiverId,
            content: message,
            type,
            attachmentUrl,
          });

          const populated = await DirectMessage.findById(saved._id).populate("senderId", "prenom nom");

          const senderObjId = new mongoose.Types.ObjectId(senderId);
          const receiverObjId = new mongoose.Types.ObjectId(receiverId);

          let conversation = await Conversation.findOne({
            participants: { $all: [senderObjId, receiverObjId] },
            $expr: { $eq: [{ $size: "$participants" }, 2] },
          });

          if (conversation) {
            await Conversation.updateOne(
              { _id: conversation._id },
              {
                $set: {
                  lastMessage: message,
                  lastHour: new Date().toISOString().slice(11, 16),
                  updatedAt: new Date(),
                },
              }
            );
          } else {
            conversation = await Conversation.create({
              participants: [senderObjId, receiverObjId],
              lastMessage: message,
              lastHour: new Date().toISOString().slice(11, 16),
              updatedAt: new Date(),
            });
          }

          io.to(receiverId).emit("new_direct_message", {
            _id: populated._id,
            message: populated.content,
            senderId: populated.senderId,
            receiverId: populated.receiverId,
            timestamp: populated.timestamp,
            type: populated.type || "text",
            attachmentUrl: populated.attachmentUrl || null,
            reactions: [],
          });

          const previewContent = populated.type === 'file'
            ? (populated.attachmentUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? '🖼️' : '📎') + ' ' + populated.attachmentUrl?.split('/').pop()
            : populated.content;

          io.to(senderId).emit("direct_message_preview", {
            contactId: receiverId,
            lastMessage: previewContent,
            lastHour: populated.timestamp,
          });

          io.to(receiverId).emit("direct_message_preview", {
            contactId: senderId,
            lastMessage: previewContent,
            lastHour: populated.timestamp,
          });

          console.log(`📤 Message direct envoyé à ${receiverId}`);
        } catch (err) {
          console.error("❌ Erreur enregistrement ou émission DM :", err);
        }
      });

      socket.on("join_channel", (channelId) => {
        socket.join(channelId);
        console.log(`🟢 Socket rejoint canal ${channelId}`);
      });

      socket.on("channel_message", async (data) => {
        const {
          channelId,
          senderId,
          senderName,
          content,
          type = "text",
          attachmentUrl = null
        } = data;

        if (!senderId || !channelId || !senderName) {
          console.warn("❌ Données incomplètes pour channel_message");
          return;
        }

        if (type !== "text") return;

        try {
          const msg = await ChannelMessage.create({
            channelId,
            senderId,
            senderName,
            content,
            type,
            attachmentUrl,
          });

          const mentionRegex = /@([\wÀ-ÿ]+)[\s.]+([\wÀ-ÿ]+)/g;
          const matches = [...content.matchAll(mentionRegex)];
          for (const match of matches) {
            const [_, prenom, nom] = match;
            const userMentioned = await require('./models/User').findOne({ prenom, nom });
            if (userMentioned) {
              await require('./models/Mention').create({
                userId: userMentioned._id,
                channelId,
                workspaceId: await getWorkspaceIdFromChannel(channelId),
                messageId: msg._id,
                content,
                timestamp: msg.createdAt,
                channelName: await getChannelName(channelId),
              });
            }
          }

          await ChannelPreview.findOneAndUpdate(
            { channelId },
            {
              lastMessage: content || '[Fichier]',
              lastHour: msg.createdAt,
            },
            { upsert: true, new: true }
          );

          io.to(channelId).emit("new_channel_message", {
            _id: msg._id,
            channelId: msg.channelId,
            senderId: msg.senderId,
            senderName: msg.senderName,
            content: msg.content,
            type: msg.type,
            attachmentUrl: msg.attachmentUrl,
            timestamp: msg.createdAt,
          });

          io.emit("channel_message_preview", {
            channelId,
            preview: content || '[Fichier]',
            timestamp: msg.createdAt,
          });

          console.log(`📤 Message texte envoyé sur canal ${channelId}`);
        } catch (err) {
          console.error("❌ Erreur message canal :", err);
        }
      });

      socket.on("channel_reaction_updated", ({ messageId, emoji, user }) => {
        if (!user || !user._id || !emoji || !messageId) {
          return console.warn("❌ Données incomplètes pour channel_reaction_updated");
        }

        io.emit("channel_reaction_updated", { messageId, emoji, user });
        console.log(`🔁 Réaction MAJ : ${emoji} par ${user.prenom} sur ${messageId}`);
      });

      socket.on("channel_reaction_removed", ({ messageId, userId, channelId }) => {
        if (!userId || !messageId || !channelId) {
          return console.warn("❌ Données incomplètes pour channel_reaction_removed");
        }

        io.to(channelId).emit("channel_reaction_removed", { messageId, userId });
        console.log(`❌ Réaction supprimée sur ${messageId} par ${userId}`);
      });

      socket.on("direct_reaction_updated", ({ messageId, emoji, user }) => {
        if (!user || !user._id || !emoji || !messageId) {
          return console.warn("❌ Données incomplètes pour direct_reaction_updated");
        }

        io.emit("direct_reaction_updated", { messageId, emoji, user });
        console.log(`🎯 Réaction direct MAJ : ${emoji} par ${user.prenom} sur ${messageId}`);
      });

      socket.on("direct_reaction_removed", ({ messageId, userId }) => {
        if (!userId || !messageId) {
          return console.warn("❌ Données incomplètes pour direct_reaction_removed");
        }

        io.emit("direct_reaction_removed", { messageId, userId });
        console.log(`🗑️ Réaction direct supprimée sur ${messageId} par ${userId}`);
      });
    });

    server.listen(PORT, () => {
      console.log(`🚀 Serveur prêt sur http://localhost:${PORT} (Web + Socket.io)`);
    });
  })
  .catch((err) => console.error("❌ MongoDB error:", err));