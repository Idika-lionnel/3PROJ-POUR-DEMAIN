const Channel = require('../models/Channel');
const Workspace = require('../models/Workspace');

async function getWorkspaceIdFromChannel(channelId) {
    const channel = await Channel.findById(channelId);
    return channel?.workspace;
}

async function getChannelName(channelId) {
    const channel = await Channel.findById(channelId);
    return channel?.name || 'Inconnu';
}


module.exports = {
    getWorkspaceIdFromChannel,
    getChannelName,

};
