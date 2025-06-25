import React, { useEffect, useState, useRef } from 'react';
import socket from '../socket';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import { Icon } from '@iconify/react';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

import { highlightMentions } from './utils/highlightMentions.jsx';
import { fetchMentionableUsers } from './utils/mentionUsers.jsx';
import { parseHashtags } from './utils/parseHashtags.jsx';
import { useChannelMap } from '../../hooks/useChannelMap.jsx';



const ChannelChatBox = ({ channelId, channelName, workspaceId }) => {
    const [showChannelSuggestions, setShowChannelSuggestions] = useState(false);
    const [channelQuery, setChannelQuery] = useState('');
    const [cursorPosition, setCursorPosition] = useState(null);
    const channelMap = useChannelMap(workspaceId);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const bottomRef = useRef(null);
    const user = JSON.parse(localStorage.getItem('user'));
    const { token } = useAuthStore();
    const [showSearchBar, setShowSearchBar] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const emojiOptions = ['❤️', '😂', '😮', '😢', '👍', '👎'];
    const [showReactionsFor, setShowReactionsFor] = useState(null);
    const navigate = useNavigate();
    const [isMember, setIsMember] = useState(false);
    const location = useLocation();
    const scrollToMessageId = new URLSearchParams(location.search).get('scrollTo')
    const messageRefs = useRef({});

    const getSenderName = (msg) => {
        if (msg.senderId?.prenom && msg.senderId?.nom) {
            return `${msg.senderId.prenom} ${msg.senderId.nom}`;
        }
        if (msg.senderName) return msg.senderName;
        if (msg.senderId === user._id) return `${user.prenom} ${user.nom}`;
        return 'Utilisateur';
    };


    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isImage = (filename) => /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);

    const renderMessage = (msg, i) => {
        const messageId = msg._id || `${Date.now()}-${i}`;
        const senderId = msg.senderId?._id || msg.senderId;
        const isMe = senderId === user._id;

        if (!messageRefs.current[messageId]) {
            messageRefs.current[messageId] = React.createRef();
        }
        const bubbleStyle = isMe
            ? 'ml-auto bg-[#0F71D3] dark:bg-[#224262] text-white'
            : 'mr-auto bg-[#0380FD1C] dark:bg-[#EEEEEE] text-[#224262] dark:text-[#224262]';
        function renderTextContent(text) {
            const highlightedMentions = highlightMentions(text, mentionableUsers);
            return highlightedMentions.flatMap((part, index) => {
                if (typeof part === 'string') {
                    return parseHashtags(part, channelMap, workspaceId);
                } else {
                    return [<React.Fragment key={index}>{part}</React.Fragment>];
                }
            });
        }
        const baseClass = `inline-block px-4 py-2 rounded-lg whitespace-pre-wrap ${bubbleStyle}`;
        const time = formatTime(msg.timestamp || msg.createdAt);
        const isImg = isImage(msg.attachmentUrl);
        const isFile = msg.type === 'file' || msg.type === 'image';

        const showEmojiSelector = (
            <div className="emoji-selector flex flex-wrap gap-1 px-2 py-1 rounded-full bg-gray-100 text-base mt-1 max-w-fit mx-auto">
                {emojiOptions.map((emoji) => {
                    const current = msg.reactions?.find((r) => {
                        const id = r.userId?._id || r.userId || r.user?._id;
                        return id === user._id && r.emoji === emoji;
                    });
                    return (
                        <span
                            key={emoji}
                            className="cursor-pointer text-lg"
                            onClick={() => toggleReaction(msg._id, current, emoji)}
                        >
        {emoji}
      </span>
                    );
                })}
            </div>

        );

        // Cas : IMAGE
        if (isImg && msg.attachmentUrl) {
            return (
                <div
                    key={msg._id || `${Date.now()}-${i}`}
                    className={`flex flex-col items-${isMe ? 'end' : 'start'}`}
                >
                    <div className={`text-[12px] ${isMe ? 'text-gray-500' : 'text-gray-500'} ${isMe ? 'text-right' : 'text-left'} mb-1`}>
                        {`${getSenderName(msg)} :`}
                    </div>
                    <img
                        src={msg.attachmentUrl}
                        alt="image"
                        className={`w-48 rounded-lg my-1 cursor-pointer ${isMe ? 'ml-auto' : 'mr-auto'}`}
                        onClick={() => window.open(msg.attachmentUrl, '_blank')}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            setShowReactionsFor((prev) =>
                                prev === msg._id ? null : msg._id
                            );
                        }}
                    />
                    {/* ✅ Bloc réactions affiché correctement */}
                    {msg.reactions?.length > 0 && (
                        <div className={`flex gap-1 flex-wrap mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(
                                msg.reactions.reduce((acc, r) => {
                                    if (!acc[r.emoji]) acc[r.emoji] = [];
                                    const displayName =
                                         r.userId?.prenom
                                            ? `${r.userId.prenom} ${r.userId.nom}`
                                            : (r.userId === user._id || r.user?._id === user._id)
                                                ? `${user.prenom} ${user.nom}`
                                                : 'Utilisateur';
                                    if (!acc[r.emoji].includes(displayName)) {
                                        acc[r.emoji].push(displayName);
                                    }
                                    return acc;
                                }, {})
                            ).map(([emoji, users], idx) => (
                                <span
                                    key={idx}
                                    className="flex items-center gap-1 text-xs bg-gray-200 rounded-full px-2 py-1 cursor-pointer"
                                    title={users.join(', ')}
                                >
            {emoji} <span className="text-gray-600">{users.length}</span>
          </span>
                            ))}
                        </div>
                    )}

                    {showReactionsFor === msg._id && showEmojiSelector}
                    <div className={`text-xs text-gray-500 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>{time}</div>
                </div>
            );
        }

        // Cas : FICHIER
        if (isFile && msg.attachmentUrl && !isImg) {
            const fileName = msg.attachmentUrl.split('/').pop();
            return (
                <div
                    key={msg._id || `${Date.now()}-${i}`}
                    className={`flex flex-col items-${isMe ? 'end' : 'start'}`}
                >

                    <div
                        className={`${baseClass} cursor-pointer`}
                        onClick={() => setShowReactionsFor((prev) =>
                            prev === msg._id ? null : msg._id
                        )}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            setShowReactionsFor((prev) =>
                                prev === msg._id ? null : msg._id
                            );
                        }}
                    >
                        <div className={`text-[12px] ${isMe ? 'text-white' : 'text-gray-500'} ${isMe ? 'text-right' : 'text-left'} mb-1`}>
                            {`${getSenderName(msg)} :`}
                        </div>
                        📎{' '}
                        <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                        >
                            {fileName}
                        </a>

                    </div>
                    {/* ✅ Bloc réactions affiché correctement */}
                    {msg.reactions?.length > 0 && (
                        <div className={`flex gap-1 flex-wrap mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(
                                msg.reactions.reduce((acc, r) => {
                                    if (!acc[r.emoji]) acc[r.emoji] = [];
                                    const displayName =
                                         r.userId?.prenom
                                            ? `${r.userId.prenom} ${r.userId.nom}`
                                            : (r.userId === user._id || r.user?._id === user._id)
                                                ? `${user.prenom} ${user.nom}`
                                                : 'Utilisateur';
                                    if (!acc[r.emoji].includes(displayName)) {
                                        acc[r.emoji].push(displayName);
                                    }
                                    return acc;
                                }, {})
                            ).map(([emoji, users], idx) => (
                                <span
                                    key={idx}
                                    className="flex items-center gap-1 text-xs bg-gray-200 rounded-full px-2 py-1 cursor-pointer"
                                    title={users.join(', ')}
                                >
            {emoji} <span className="text-gray-600">{users.length}</span>
          </span>
                            ))}
                        </div>
                    )}
                    {showReactionsFor === msg._id && showEmojiSelector}
                    <div className={`text-xs text-gray-500 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>{time}</div>
                </div>
            );
        }

        // Cas : TEXTE
        return (
            <div
                key={msg._id || i}
                ref={messageRefs.current[msg._id]}
                className={`flex flex-col items-${isMe ? 'end' : 'start'}`}
            >

                <div
                    className={`${baseClass} cursor-pointer max-w-[75%]`}
                    onClick={() =>
                        setShowReactionsFor((prev) => (prev === msg._id ? null : msg._id))
                    }
                    onContextMenu={(e) => {
                        e.preventDefault();
                        setShowReactionsFor((prev) =>
                            prev === msg._id ? null : msg._id
                        );
                    }}
                >
                    <div className={`text-[12px] ${isMe ? 'text-white' : 'text-gray-500'} ${isMe ? 'text-right' : 'text-left'} mb-1`}>
                        {`${getSenderName(msg)} :`}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-1">
                         {renderTextContent(msg.content)}
                    </div>

                </div>
                {/* Réactions visibles */}
                {msg.reactions?.length > 0 && (
                    <div className={`flex gap-1 flex-wrap mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {Object.entries(
                            msg.reactions.reduce((acc, r) => {
                                if (!acc[r.emoji]) acc[r.emoji] = [];

                                const displayName =
                                     r.userId?.prenom
                                        ? `${r.userId.prenom} ${r.userId.nom}`
                                        : (r.userId === user._id || r.user?._id === user._id)
                                            ? `${user.prenom} ${user.nom}`
                                            : 'Utilisateur';

                                // ✅ Évite les doublons pour un même emoji
                                if (!acc[r.emoji].includes(displayName)) {
                                    acc[r.emoji].push(displayName);
                                }

                                return acc;
                            }, {})
                        ).map(([emoji, users], idx) => (
                            <span
                                key={idx}
                                className="flex items-center gap-1 text-xs bg-gray-200 rounded-full px-2 py-1 cursor-pointer"
                                title={users.join(', ')}
                            >
        {emoji} <span className="text-gray-600">{users.length}</span>
      </span>
                        ))}
                    </div>
                )}



                {showReactionsFor === msg._id && showEmojiSelector}
                <div className={`text-xs text-gray-500 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>{time}</div>
            </div>
        );
    };


    const handleNewMessage = (msg) => {
        if (msg.channelId !== channelId) return;
        setMessages((prev) => [...prev, msg]);
        // Pour mettre à jour le dernier message et l'aperçu dans ChannelSidebar
        socket.emit('channel_message_preview', {
            channelId: msg.channelId,
            preview: msg.content || '[Fichier]',
            timestamp: msg.timestamp || new Date().toISOString()
        });
    };

    const fetchMessages = async () => {
        try {
            const [messagesRes, channelRes] = await Promise.all([
                axios.get(
                    `http://localhost:5050/api/workspaces/${workspaceId}/channels/${channelId}/messages`,
                    { headers: { Authorization: `Bearer ${token}` } }
                ),
                axios.get(
                    `http://localhost:5050/api/workspaces/${workspaceId}/channels/${channelId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                )
            ]);

            setMessages(messagesRes.data);

            const channelMembers = channelRes.data.members;
            const isCurrentUserMember = channelMembers.some(m => String(m._id) === String(user._id));
            setIsMember(isCurrentUserMember);
        } catch (err) {
            console.error('Erreur chargement messages :', err);
        }
    };

    const handleSend = () => {
        if (!message.trim()) return;

        const newMsg = {
            channelId,
            senderId: user._id,
            senderName: `${user.prenom} ${user.nom}`,
            content: message,
            type: 'text',
            timestamp: new Date().toISOString()
        };

        socket.emit('channel_message', newMsg); // laisse le serveur créer et renvoyer

        setMessage('');
    };

    const toggleReaction = async (messageId, currentReaction, emoji) => {
        try {
            if (currentReaction && currentReaction.emoji === emoji) {
                // supprimer l’unique réaction de ce user à ce message
                await axios.delete(`http://localhost:5050/api/workspaces/${workspaceId}/channels/reaction/${messageId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    data: { userId: user._id }
                });
            } else {
                // d’abord supprimer toute réaction précédente
                await axios.delete(`http://localhost:5050/api/workspaces/${workspaceId}/channels/reaction/${messageId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    data: { userId: user._id }
                });

                // ensuite ajouter la nouvelle
                await axios.post(`http://localhost:5050/api/workspaces/${workspaceId}/channels/reaction/${messageId}`, { emoji }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

        } catch (err) {
            console.error('Erreur envoi réaction :', err);
        } finally {
            setShowReactionsFor(null);
        }
    };


    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('senderId', user._id);
        formData.append('channelId', channelId);
        formData.append('senderName', `${user.prenom} ${user.nom}`);

        try {
            const res = await axios.post(
                `http://localhost:5050/api/upload/channel/${channelId}`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            // ❌ NE PAS faire socket.emit ici
            // Le serveur émet déjà `new_channel_message`

            // Affichage immédiat pour l'émetteur
        } catch (err) {
            console.error('Erreur envoi fichier :', err);
        }
    };
    useEffect(() => {
        if (scrollToMessageId && messageRefs.current[scrollToMessageId]) {
            const ref = messageRefs.current[scrollToMessageId];
            if (ref.current) {
                ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [messages, scrollToMessageId]);

    const [mentionableUsers, setMentionableUsers] = useState(new Set());

    useEffect(() => {
        fetchMentionableUsers(token).then(setMentionableUsers);
    }, [token]);

    useEffect(() => {
        fetchMessages();

        socket.emit('join_channel', channelId);
        socket.on('new_channel_message', handleNewMessage);
        socket.on('channel_reaction_updated', (update) => {
            setMessages(prev =>
                prev.map(msg => {
                    if (msg._id !== update.messageId) return msg;

                    const updatedReactions = (msg.reactions || []).filter(r => {
                        const id = r.user?._id || r.userId?._id || r.userId;
                        return id !== update.user._id;
                    });

                    return {
                        ...msg,
                        reactions: [...updatedReactions, { emoji: update.emoji, userId: update.user }]
                    };
                })
            );
        });

        socket.on('channel_reaction_removed', ({ messageId, userId }) => {
            setMessages(prev =>
                prev.map(msg =>
                    msg._id === messageId
                        ? {
                            ...msg,
                            reactions: (msg.reactions || []).filter(
                                r => {
                                    const id = r.user?._id || r.userId?._id || r.userId;
                                    return id !== userId;
                                }
                            )
                        }
                        : msg
                )
            );
        });

        return () => {
            socket.off('new_channel_message', handleNewMessage);
            socket.off('channel_reaction_updated');
            socket.off('channel_reaction_removed');
        };

    }, [channelId]);

    useEffect(() => {
        if (messages.length === 0) return;

        const markAsRead = async () => {
            try {
                await axios.patch(
                    `http://localhost:5050/api/workspaces/${workspaceId}/channels/${channelId}/mark-as-read`,
                    { userId: user._id },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                socket.emit('channel_read', { channelId, userId: user._id });
            } catch (err) {
                console.error("Erreur mark-as-read canal :", err);
            }
        };

        markAsRead();
    }, [messages.length]);




    useEffect(() => {
        if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.emoji-selector')) {
                setShowReactionsFor(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);
    const insertHashtag = (name) => {
        const before = message.slice(0, cursorPosition).replace(/#([a-zA-Z0-9_-]*)$/, '');
        const after = message.slice(cursorPosition);
        const newMessage = `${before}#${name} ${after}`; // espace pour séparer
        setMessage(newMessage);
        setShowChannelSuggestions(false);
        setChannelQuery('');
    };

    const filteredMessages = messages.filter((msg) =>
        msg.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.attachmentUrl?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const handleEmojiClick = (emojiData) => {
        setMessage((prev) => prev + emojiData.emoji);
    };
    const handleInputChange = (e) => {
        const value = e.target.value;
        setMessage(value);

        const cursor = e.target.selectionStart;
        setCursorPosition(cursor);

        const match = value.slice(0, cursor).match(/#([a-zA-Z0-9_-]*)$/);
        if (match) {
            setChannelQuery(match[1]);  // texte tapé après #
            setShowChannelSuggestions(true);
        } else {
            setShowChannelSuggestions(false);
            setChannelQuery('');
        }
    };

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b bg-white dark:bg-[#0f172a] dark:border-gray-700 shadow-sm">

            {/* Nom + badge canal */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-300  rounded-full flex items-center justify-center text-white dark:text-[#0A3A66] font-bold">
                        #{channelName?.charAt(0)?.toUpperCase()}
                    </div>

                    <div
                        className="text-sm font-medium text-gray-800 dark:text-[#EEEEEE] hover:text-gray-800 cursor-pointer"
                        onClick={() => navigate(`/channels/${channelId}`)}
                    >
                        # {channelName}
                    </div>
                </div>

                {/* Barre de recherche dépliante */}
                {showSearchBar && (
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-[#f1f1f1] text-sm px-3 py-2 rounded-md border border-gray-300 focus:outline-none w-60 transition-all duration-200"
                    />
                )}

                {/* Loupe à droite */}
                <Icon
                    icon="mingcute:search-line"
                    className="text-gray-600  dark:text-[#EEEEEE] cursor-pointer"
                    width="22"
                    height="22"
                    onClick={() => setShowSearchBar((prev) => !prev)}
                />
            </div>



            {/* Chat scrollable */}
            <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-[#0f172a]">
                <ul className="space-y-2 text-sm">
                    {filteredMessages.map((msg, i) => (
                        <li key={msg._id || i}>{renderMessage(msg, i)}</li>
                    ))}
                </ul>
                <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            {isMember ? (
                <div className="bg-white dark:bg-[#0f172a] p-4 border-t dark:border-gray-700 flex items-center gap-2">
                    <div className="relative flex-1">
                        <Icon
                            icon="fluent:emoji-24-regular"
                            className="absolute top-1/2 left-3 transform -translate-y-1/2 cursor-pointer"
                            color="#AFAFAF"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        />
                        {showChannelSuggestions && (
                           <ul className="absolute bottom-full mb-2 bg-[#0F71D3] dark:bg-[#224262] text-white border border-[#0F71D3] dark:border-[#224262] rounded-md shadow-lg z-10 max-h-48 overflow-y-auto w-72 text-sm divide-y divide-white dark:divide-white scrollbar-hide">
                                {Object.keys(channelMap)
                                    .filter((name) => name.includes(channelQuery.toLowerCase()))
                                    .map((name) => (
                                        <li
                                            key={name}
                                            className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                            onClick={() => insertHashtag(name)}
                                        >
                                            #{name}
                                        </li>
                                    ))}
                            </ul>
                        )}

                        <input
                            value={message}
                            onChange={handleInputChange}
                            placeholder="Message..."
                            className="bg-[#EEEEEE] text-[#333] px-10 py-2 rounded-[8px] w-full focus:outline-none text-sm"
                        />

                        {showEmojiPicker && (
                            <div className="absolute bottom-12 left-0 z-20">
                                <EmojiPicker onEmojiClick={handleEmojiClick} />
                            </div>
                        )}
                    </div>

                    <label className="cursor-pointer">
                        <Icon icon="mingcute:add-line" color="#AFAFAF" width="26" height="26" />
                        <input type="file" onChange={handleFileUpload} className="hidden" />
                    </label>

                    <button
                        onClick={handleSend}
                        className="bg-[#0F71D3] p-2 rounded-md hover:bg-blue-700"
                    >
                        <Icon icon="mingcute:arrow-up-fill" color="white" width="22" height="22" />
                    </button>
                </div>
            ) : (
                <div className="bg-yellow-100 text-yellow-700 text-center py-4 border-t">
                    ⚠️ Vous devez être membre de ce canal pour envoyer des messages.
                </div>
            )}

        </div>
    );

};

export default ChannelChatBox;
