import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { Icon } from '@iconify/react';
import socket from '../socket';


const ChannelSidebar = ({ activeChannelId }) => {
    const { id: workspaceId } = useParams();
    const { token } = useAuthStore();
    const navigate = useNavigate();
    const [workspaceName, setWorkspaceName] = useState('');

    const [channels, setChannels] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [unreadCounts, setUnreadCounts] = useState({});
    useEffect(() => {
        const fetchWorkspaceName = async () => {
            try {
                const res = await axios.get(`http://localhost:5050/api/workspaces/${workspaceId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setWorkspaceName(res.data.name);
            } catch (err) {
                console.error("Erreur récupération nom du workspace :", err);
            }
        };

        if (workspaceId && token) fetchWorkspaceName();
    }, [workspaceId, token]);


    useEffect(() => {
        socket.on('channel_read', async ({ channelId, userId }) => {
            const currentUser = JSON.parse(localStorage.getItem('user'));
            if (!currentUser || String(userId) !== String(currentUser._id)) return;

            try {
                const res = await axios.get(
                    `http://localhost:5050/api/workspaces/${workspaceId}/channels/unread-count/${currentUser._id}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setUnreadCounts(res.data);
            } catch (err) {
                console.error("Erreur mise à jour unreadCounts :", err);
            }
        });




        return () => {
            socket.off('channel_read');
        };
    }, []);

    useEffect(() => {
        socket.on('channel_message_preview', ({ channelId, preview, timestamp }) => {
            setChannels(prev => prev.map(ch => {
                if (ch._id === channelId) {
                    return {
                        ...ch,
                        lastMessage: preview,
                        lastHour: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };
                }
                return ch;
            }));
        });

        return () => {
            socket.off('channel_message_preview');
        };
    }, []);



    useEffect(() => {
        const fetchChannels = async () => {
            try {
                const res = await axios.get(
                    `http://localhost:5050/api/channel-previews/${workspaceId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setChannels(res.data);
                // Charger les messages non lus
                const user = JSON.parse(localStorage.getItem('user'));
                if (user && user._id) {
                    const unreadRes = await axios.get(
                        `http://localhost:5050/api/workspaces/${workspaceId}/channels/unread-count/${user._id}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    setUnreadCounts(unreadRes.data);
                }

            } catch (err) {
                console.error('Erreur chargement canaux :', err);
            }
        };

        if (workspaceId && token) fetchChannels();
    }, [workspaceId, token]);

    const isImage = (str) => str && /\.(jpg|jpeg|png|gif|webp)$/i.test(str);
    const isDocument = (str) => str && /\.(pdf|docx?|xlsx?|zip|rar)$/i.test(str);

    const filteredChannels = channels
        .filter((ch) => {
            if (filter === 'public') return ch.isPrivate === false;
            if (filter === 'private') return ch.isPrivate === true;
            return true;
        })
        .filter((ch) =>
            ch.name.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name));

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));

        const handleNewMessage = (msg) => {
            if (
                !msg.channelId ||
                msg.senderId === user._id ||
                msg.channelId === activeChannelId
            ) return;

            // Si le canal n’est pas encore dans unreadCounts, ne rien faire
            if (!(msg.channelId in unreadCounts)) return;

            setUnreadCounts(prev => ({
                ...prev,
                [msg.channelId]: (prev[msg.channelId] || 0) + 1
            }));
        };

        socket.on('new_channel_message', handleNewMessage);
        return () => socket.off('new_channel_message', handleNewMessage);
    }, [activeChannelId, unreadCounts]);

    useEffect(() => {
        const fetchPreviews = async () => {
            try {
                const res = await axios.get(
                    `http://localhost:5050/api/channel-previews/${workspaceId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const previewData = res.data;

                setChannels(prev =>
                    prev.map(ch => ({
                        ...ch,
                        lastMessage: previewData[ch._id]?.lastMessage || '',
                        lastHour: previewData[ch._id]?.lastHour || ''
                    }))
                );
            } catch (err) {
                console.error('Erreur previews :', err);
            }
        };

        if (workspaceId && token) fetchPreviews();
    }, [workspaceId, token]);




    return (
        <div className="w-full h-full bg-white dark:bg-[#0f172a] text-black dark:text-white flex flex-col border-r">
            <div
                className="px-4 pt-4 pb-2 font-bold cursor-pointer flex items-center gap-2"
                style={{ color: '#224262', fontSize: '17px' }}
                onClick={() => navigate(`/workspaces/${workspaceId}`)}
            >
                <Icon icon="carbon:workspace" width="20" height="20" className="relative top-[1px] dark:text-[#EEEEEE]" />
                <span className="leading-none dark:text-[#EEEEEE] ">{workspaceName || 'Nom du workspace'}</span>
            </div>

            {/* Recherche */}
            <div className="p-4">
                <div className="relative">
                    <Icon icon="ic:round-search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher un canal"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border rounded-full text-sm focus:outline-none bg-gray-100 dark:bg-gray-800 dark:border-gray-700"
                    />
                </div>
            </div>

            {/* Filtres */}
            <div className="px-4 pb-2 flex justify-between text-sm text-gray-600 dark:text-gray-300 font-medium">
                {['all', 'public', 'private'].map((key) => (
                    <button
                        key={key}
                        className={`capitalize ${filter === key ? 'text-[#0F71D3] font-semibold' : ''}`}
                        onClick={() => setFilter(key)}
                    >
                        {key === 'all' ? 'Tous' : key === 'public' ? 'Publics' : 'Privés'}
                    </button>
                ))}
            </div>

            {/* Liste des canaux */}
            <div className="flex-1 overflow-y-auto">
                {filteredChannels.length === 0 ? (
                    <div className="px-4 text-sm text-gray-500 dark:text-gray-400 italic">Aucun canal trouvé.</div>
                ) : (
                    filteredChannels.map((channel) => {
                        const isFile = isImage(channel.lastMessage) || isDocument(channel.lastMessage);
                        const icon = isImage(channel.lastMessage)
                            ? '🖼️'
                            : isDocument(channel.lastMessage)
                                ? '📎'
                                : '';
                        const last = channel.lastMessage || 'Pas encore de message';
                        const time = channel.lastHour || '';

                        return (
                            <div
                                key={channel._id}
                                onClick={() => {
                                    navigate(`/workspaces/${workspaceId}/channels/${channel._id}`);
                                    setUnreadCounts(prev => ({
                                        ...prev,
                                        [channel._id]: 0
                                    }));
                                   }}
                                className="px-4 py-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700"
                            >
                                <div className="font-medium text-sm mb-1 flex justify-between items-center">
                                      <span># {channel.name}</span>
                                      {unreadCounts[channel._id] > 0 && (
                                        <span className="ml-2 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                                          {unreadCounts[channel._id]}
                                        </span>
                                      )}
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span className="truncate italic">
                    {isFile ? `${icon} ${last}` : last}
                  </span>
                                    <span>{time}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ChannelSidebar;
