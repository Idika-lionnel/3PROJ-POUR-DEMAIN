const express = require("express");
const router = express.Router();
const ChannelPreview = require("../models/ChannelPreview");
const Channel = require("../models/Channel");
const auth = require("../middleware/auth");

router.get("/:workspaceId", auth, async (req, res) => {
    const { workspaceId } = req.params;
    const userId = req.user._id;

    try {
        const channels = await Channel.find({
            workspace: workspaceId,
            $or: [
                { isPrivate: false },
                { members: userId }
            ]
        }).lean();

        const previews = await ChannelPreview.find({
            channelId: { $in: channels.map(ch => ch._id) }
        }).lean();

        const previewMap = previews.reduce((acc, p) => {
            acc[p.channelId.toString()] = {
                lastMessage: p.lastMessage,
                lastHour: p.lastHour,
            };
            return acc;
        }, {});

        const enrichedChannels = channels.map(ch => {
            const preview = previewMap[ch._id.toString()] || {};
            return {
                ...ch,
                lastMessage: preview.lastMessage || '',
                lastHour: preview.lastHour
                  ? new Date(preview.lastHour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : null,
            };
        });

        res.json(enrichedChannels);
    } catch (err) {
        console.error("Erreur récupération previews :", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

module.exports = router;
