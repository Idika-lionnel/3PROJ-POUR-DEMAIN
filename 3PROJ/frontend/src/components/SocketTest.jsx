import React, { useEffect, useState, useRef } from 'react';
import socket from '../socket';
import { Icon } from '@iconify/react';
import EmojiPicker from 'emoji-picker-react';

const SocketTest = ({ contacts = [], receiverId, setRefreshUnread  }) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [users, setUsers] = useState({});
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const usersRef = useRef({});
    const bottomRef = useRef(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('')
    const [rawMessages, setRawMessages] = useState([]);
    const [showReactionsFor, setShowReactionsFor] = useState(null);
    const emojiOptions = ['❤️', '😂', '😮', '😢', '👍', '👎'];

    const [receiverInfo, setReceiverInfo] = useState(null);

    useEffect(() => {
    const fetchReceiverInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5050/api/users/${receiverId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      setReceiverInfo(data);
    } catch (err) {
      console.error("Erreur récupération receiver :", err);
    }
  };

  if (receiverId) {
    fetchReceiverInfo();
  }
}, [receiverId]);


    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user?._id) {
            setCurrentUserId(user._id);
            const fullName = `${user.prenom} ${user.nom}`;
            setUsers((prev) => ({ ...prev, [user._id]: fullName }));
            usersRef.current[user._id] = fullName;
        }
    }, []);

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isImage = (filename) => /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);

    const formatMessageDisplay = (msg, isMe, senderName) => {
        const messageKey = msg._id || msg.timestamp || Date.now();
        const content = msg.content || msg.message || '';
        const time = msg.timestamp ? formatTime(msg.timestamp) : '';
        const reactions = msg.reactions || [];

        const currentUserReaction = reactions.find(
            (r) => (r.userId?._id || r.userId) === currentUserId
        );

        const bubbleStyle = isMe
            ? 'bg-[#0F71D3] dark:bg-[#224262] text-white ml-auto'
               : 'bg-[#0380FD1C] dark:bg-[#EEEEEE] text-[#224262] dark:text-[#224262] mr-auto';

        const baseClass = `max-w-xs px-4 py-2 rounded-lg whitespace-pre-wrap ${bubbleStyle}`;

        const renderReactions = () => {
            if (reactions.length === 0) return null;

            const grouped = reactions.reduce((acc, r) => {
                const emoji = r.emoji;
                const id = r.userId?._id || r.userId;
                const name =
                    typeof r.userId === 'object' && r.userId?.prenom && r.userId?.nom
                        ? `${r.userId.prenom} ${r.userId.nom}`
                        : usersRef.current[id] || 'Moi';
                if (!acc[emoji]) acc[emoji] = [];
                if (!acc[emoji].includes(name)) acc[emoji].push(name);
                return acc;
            }, {});

            return (
                <div className={`flex gap-1 flex-wrap mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {Object.entries(grouped).map(([emoji, users], idx) => (
                        <span
                            key={idx}
                            className="flex items-center gap-1 text-xs bg-gray-200 rounded-full px-2 py-1 cursor-pointer"
                            title={users.join(', ')}
                        >
                        {emoji} <span className="text-gray-600">{users.length}</span>
                    </span>
                    ))}
                </div>
            );
        };

        const renderEmojiSelector = () => {
            if (showReactionsFor !== messageKey) return null;

            return (
                <div className={`emoji-selector flex gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {emojiOptions.map((emoji) => (
                        <span
                            key={emoji}
                            className="cursor-pointer text-lg"
                            onClick={() => toggleReaction(msg._id, currentUserReaction, emoji)}
                        >
                        {emoji}
                    </span>
                    ))}
                </div>
            );
        };

        // === Message Image ===
        if (msg.type === 'file' && msg.attachmentUrl && isImage(msg.attachmentUrl)) {
            return (
                <div key={messageKey} className={`flex flex-col items-${isMe ? 'end' : 'start'}`}>
                    <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer">
                        <img
                            src={msg.attachmentUrl}
                            alt={content}
                            className={`w-48 my-1 rounded-lg cursor-pointer hover:opacity-90 ${isMe ? 'ml-auto' : 'mr-auto'}`}
                            onClick={() =>
                                setShowReactionsFor((prev) => (prev === messageKey ? null : messageKey))
                            }
                            onContextMenu={(e) => {
                                e.preventDefault();
                                setShowReactionsFor(messageKey);
                            }}
                        />
                    </a>
                    {renderReactions()}
                    <div className={`text-xs text-gray-500 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>{time}</div>

                    {renderEmojiSelector()}
                </div>
            );
        }

        // === Message Fichier ===
        if (msg.type === 'file' && msg.attachmentUrl) {
            const filename = msg.attachmentUrl.split('/').pop();
            return (
                <div
                    key={messageKey}
                    className={`flex flex-col items-${isMe ? 'end' : 'start'}`}
                    onClick={() =>
                        setShowReactionsFor((prev) => (prev === messageKey ? null : messageKey))
                    }
                    onContextMenu={(e) => {
                        e.preventDefault();
                        setShowReactionsFor(messageKey);
                    }}
                >
                    <div className={baseClass}>
                        📎{' '}
                        <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                        >
                            {filename}
                        </a>
                    </div>
                    {renderReactions()}
                    <div className={`text-xs text-gray-500 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>{time}</div>
                    {renderEmojiSelector()}
                </div>
            );
        }

        // === Message Texte ===
        return (
            <div key={messageKey} className={`flex flex-col items-${isMe ? 'end' : 'start'}`}>
                <div
                    className={baseClass}
                    onClick={() =>
                        setShowReactionsFor((prev) => (prev === messageKey ? null : messageKey))
                    }
                    onContextMenu={(e) => {
                        e.preventDefault();
                        setShowReactionsFor(messageKey);
                    }}
                >
                    {content}
                </div>
                {renderReactions()}
                <div className={`text-xs text-gray-500 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>{time}</div>
                {renderEmojiSelector()}
            </div>
        );
    };









    const handleNewMessage = async (msg) => {
        const selectedId = typeof receiverId === 'object' ? receiverId._id : receiverId;
        const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
        const receiver = typeof msg.receiverId === 'object' ? msg.receiverId._id : msg.receiverId;

        if (senderId !== selectedId && receiver !== selectedId) return;

        const isMe = senderId === currentUserId;

        let senderName = usersRef.current[senderId];
        if (!senderName && typeof msg.senderId === 'object' && msg.senderId?.prenom && msg.senderId?.nom) {
            senderName = `${msg.senderId.prenom} ${msg.senderId.nom}`;
            usersRef.current[senderId] = senderName;
            setUsers(prev => ({ ...prev, [senderId]: senderName }));
        }

        setMessages(prev => [...prev, msg]);
        if (!isMe && receiverId === senderId) {
            await fetch(`http://localhost:5050/api/messages/mark-read/${senderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentUserId })
            });
        }
        if (
            // Si le message vient du contact actuellement affiché
            (msg.senderId === receiverId || (msg.senderId?._id === receiverId)) ||
            // Ou si le message est envoyé par l’utilisateur vers ce contact
            (msg.receiverId === receiverId || (msg.receiverId?._id === receiverId))
        ) {
            setRefreshUnread?.(prev => !prev); // ✅ force le refresh
        }

    };

    const handleReactionUpdate = ({ messageId, emoji, user }) => {
        setMessages(prev =>
            prev.map(msg => {
                if ((msg._id || msg.timestamp) !== messageId) return msg;
                const updatedReactions = [
                    ...(msg.reactions || []).filter(
                        r => (r.userId?._id || r.userId) !== (user._id || user)
                    ),
                    { emoji, userId: user }
                ];
                return { ...msg, reactions: updatedReactions };
            })
        );
    };


    const handleReactionRemove = ({ messageId, userId }) => {
        setMessages(prev => prev.map(msg => {
            if ((msg._id || msg.timestamp) !== messageId) return msg;
            return {
                ...msg,
                reactions: (msg.reactions || []).filter(r => (r.userId?._id || r.userId) !== userId)
            };
        }));

    };


    useEffect(() => {
        if (!currentUserId) return;

        socket.emit('join', currentUserId);

        // Nettoyage avant de rebrancher les écouteurs
        socket.off('new_direct_message');
        socket.off('direct_reaction_updated');
        socket.off('direct_reaction_removed');

        socket.on('new_direct_message', handleNewMessage);
        socket.on('direct_reaction_updated', handleReactionUpdate);
        socket.on('direct_reaction_removed', handleReactionRemove);

        return () => {
            socket.off('new_direct_message');
            socket.off('direct_reaction_updated');
            socket.off('direct_reaction_removed');
        };
    }, [currentUserId, receiverId]);

    useEffect(() => {
        if (receiverId && contacts.length > 0) {
            const contact = contacts.find(u => u._id === receiverId);
            if (contact && !usersRef.current[receiverId]) {
                const fullName = `${contact.prenom} ${contact.nom}`;
                usersRef.current[receiverId] = fullName;
                setUsers(prev => ({ ...prev, [receiverId]: fullName }));
            }
        }
    }, [receiverId, contacts]);

    useEffect(() => {
        const fetchMessages = async () => {
            if (!receiverId || !currentUserId) return;
            try {
                const res = await fetch(`http://localhost:5050/api/messages/${receiverId}?currentUserId=${currentUserId}`);
                const data = await res.json();
                const updatedUsers = { ...usersRef.current };
                const formatted = data.map(msg => {
                    const sender = msg.senderId;
                    const senderId = typeof sender === 'object' ? sender._id : sender;
                    if (!updatedUsers[senderId] && sender?.prenom && sender?.nom) {
                        updatedUsers[senderId] = `${sender.prenom} ${sender.nom}`;
                    }
                    const isMe = senderId === currentUserId;
                    const senderName = isMe ? 'Moi' : updatedUsers[senderId] || 'Utilisateur inconnu';
                    return formatMessageDisplay(msg, isMe, senderName);
                });
                usersRef.current = updatedUsers;
                setUsers(updatedUsers);
                setMessages(data);
                setRawMessages(data.map(m => m.content || m.message || ''));
                await fetch(`http://localhost:5050/api/messages/mark-read/${receiverId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentUserId })
                });

            } catch (err) {
                console.error('❌ Erreur chargement historique :', err);
            }
        };
        fetchMessages();
    }, [currentUserId, receiverId]);

    const handleSend = () => {
        if (!message.trim() || !currentUserId || !receiverId) return;
        const newMsg = {
            senderId: currentUserId,
            receiverId,
            message,
            type: 'text',
            timestamp: new Date().toISOString(),
        };
        socket.emit('direct_message', newMsg);
        handleNewMessage(newMsg);
        setMessage('');
    };
    const toggleReaction = async (messageId, currentReaction, emoji) => {
        try {
            if (currentReaction) {
                await fetch(`http://localhost:5050/api/messages/reaction/${messageId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUserId })
                });
            }

            if (!currentReaction || currentReaction.emoji !== emoji) {
                await fetch(`http://localhost:5050/api/messages/reaction/${messageId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUserId, emoji })
                });
            }
        } catch (err) {
            console.error("❌ Erreur toggleReaction :", err);
        }
    };


    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !currentUserId || !receiverId) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('senderId', currentUserId);
        formData.append('receiverId', receiverId);
        formData.append('type', 'file');

        try {
            const res = await fetch('http://localhost:5050/api/messages/upload', {
                method: 'POST',
                body: formData,
            });

            const saved = await res.json();
            setMessages(prev => [...prev, saved]);

        } catch (err) {
            console.error('❌ Erreur envoi fichier :', err);
        }
    };

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleEmojiClick = (emojiData) => {
        setMessage(prev => prev + emojiData.emoji);
    };

    const contact = contacts.find(c => c._id === receiverId);
    const displayName = users[receiverId] || (contact ? `${contact.prenom} ${contact.nom}` : 'Destinataire');
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.emoji-selector')) {
                setShowReactionsFor(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    return (
        <div className="flex flex-col h-full">
          {/* Header combiné : avatar + statut + nom + loupe + recherche */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-white dark:bg-[#0f172a] dark:border-gray-700 shadow-sm sticky top-0 z-10">
            <div className="flex items-center gap-3 flex-1 overflow-hidden">
              <div className="relative">
                <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-blue-900 dark:text-white uppercase">
                  {receiverInfo?.prenom?.[0] || '?'}
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                    receiverInfo?.status === 'online'
                      ? 'bg-green-500'
                      : receiverInfo?.status === 'busy'
                      ? 'bg-red-500'
                      : 'bg-gray-400'
                  }`}
                />
              </div>
      
              <div className="flex-1">
                {!searchOpen ? (
                  <div className="text-sm font-medium text-gray-800 dark:text-[#EEEEEE] truncate">
                    {receiverInfo?.prenom} {receiverInfo?.nom}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-full bg-[#f1f1f1] px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none"
                  />
                )}
              </div>
            </div>
      
            <button
              onClick={() => setSearchOpen((prev) => !prev)}
              className="text-[#0F71D3] hover:text-blue-700 dark:text-white ml-3"
            >
              <Icon icon="mdi:magnify" width="24" />
            </button>
          </div>
      
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-white dark:bg-[#0f172a]">
            <ul className="space-y-2 text-sm">
              {messages
                .filter(msg =>
                  !searchQuery.trim() ||
                  (msg.content || msg.message || '').toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((msg, i) => {
                  const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
                  const isMe = senderId === currentUserId;
                  const senderName = isMe ? 'Moi' : usersRef.current[senderId] || 'Utilisateur inconnu';
      
                  return (
                    <li key={msg._id || i}>
                      {formatMessageDisplay(msg, isMe, senderName)}
                    </li>
                  );
                })}
            </ul>
            <div ref={bottomRef} />
          </div>
      
          {/* Barre d'envoi */}
          <div className="bg-white dark:bg-[#0f172a] p-4 border-t dark:border-gray-700 flex items-center gap-2 relative">
            <div className="relative flex-1">
              <Icon
                icon="fluent:emoji-24-regular"
                color="#AFAFAF"
                width="22"
                height="22"
                className="absolute top-1/2 left-3 transform -translate-y-1/2 cursor-pointer"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              />
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message..."
                className="bg-[#EEEEEE] text-[#333] dark:text-[#EEEEEE] px-10 py-2 rounded-[8px] w-full focus:outline-none text-sm"
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
              disabled={!currentUserId || !message.trim()}
              className="bg-[#0F71D3] p-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              <Icon icon="mingcute:arrow-up-fill" color="white" width="22" height="22" />
            </button>
          </div>
        </div>
      );
};

export default SocketTest;
