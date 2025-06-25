import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import socket from '../socket'; // Assure-toi que ce fichier existe et configure bien la connexion Socket.io

const ConversationList = ({ contacts: initialContacts, selectedId, onSelect, allUsers = [], userId, refreshUnread }) => {
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [unreadMap, setUnreadMap] = useState({});
    const [contacts, setContacts] = useState(initialContacts || []);
    useEffect(() => {
        setContacts(initialContacts || []);
    }, [initialContacts]);

    // 🔁 Met à jour la preview en temps réel
    useEffect(() => {
        const handlePreviewUpdate = ({ contactId, lastMessage, lastHour }) => {
            setContacts(prev =>
                prev.map(c =>
                    c._id === contactId
                        ? {
                            ...c,
                            lastMessage,
                            lastHour: new Date(lastHour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                        : c
                )
            );
        };

        socket.on("direct_message_preview", handlePreviewUpdate);
        return () => socket.off("direct_message_preview", handlePreviewUpdate);
    }, []);

    // 🔁 Met à jour les non lus
    useEffect(() => {
        if (!userId || filter === 'contacts') return;

        const fetchUnreadCounts = async () => {
            try {
                const res = await fetch(`http://localhost:5050/api/messages/unread-count/${userId}`);
                const data = await res.json();
                setUnreadMap(data);
            } catch (err) {
                console.error('❌ Erreur chargement unread count :', err);
            }
        };

        fetchUnreadCounts();
    }, [userId, filter, refreshUnread]);

    const searchMatch = (c) => {
        const name = `${c.prenom} ${c.nom}`.toLowerCase();
        return name.includes(search.toLowerCase());
    };

    const isImage = (str) => str && /\.(jpg|jpeg|png|gif|webp)$/i.test(str);
    const isDocument = (str) => str && /\.(pdf|docx?|xlsx?|zip|rar)$/i.test(str);

    const filtered =
        filter === 'contacts'
            ? allUsers
                .filter((u) => u._id !== userId)
                .filter(searchMatch)
                .sort((a, b) => {
                    const prenomA = a?.prenom || '';
                    const prenomB = b?.prenom || '';
                    return prenomA.localeCompare(prenomB);
                })
            : contacts
                .filter((c) => {
                    if (filter === 'unread') return unreadMap[c._id] > 0;
                    if (filter === 'all') return !!c.lastMessage;
                    return true;
                })
                .filter(searchMatch)
                .sort((a, b) => {
                    const prenomA = a?.prenom || '';
                    const prenomB = b?.prenom || '';
                    return prenomA.localeCompare(prenomB);
                });


    return (
        <div className="w-[300px] border-r bg-white dark:bg-[#0f172a] flex flex-col text-black dark:text-white">
            {/* Search */}
            <div className="p-4">
                <div className="relative">
                    <Icon icon="ic:round-search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border rounded-full text-sm focus:outline-none bg-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="px-4 pb-2 flex justify-between text-sm text-gray-600 dark:text-gray-300 font-medium">
                {['all', 'unread', 'contacts'].map((key) => (
                    <button
                        key={key}
                        className={`capitalize ${filter === key ? 'text-[#0F71D3] font-semibold' : ''}`}
                        onClick={() => setFilter(key)}
                    >
                        {key === 'all' ? 'All chats' : key}
                    </button>
                ))}
            </div>

            {/* Contact list */}
            <div className="flex-1 overflow-y-auto">
                {filtered.map((contact) => {
                    const isFile = isImage(contact.lastMessage) || isDocument(contact.lastMessage);
                    const hasEmoji = contact.lastMessage?.startsWith('📎') || contact.lastMessage?.startsWith('🖼️');
                    const icon = !hasEmoji
                        ? isImage(contact.lastMessage) ? '🖼️' : isDocument(contact.lastMessage) ? '📎' : ''
                        : '';

                    {isFile ? `${icon} ${contact.lastMessage}` : contact.lastMessage}
                    return (
                        <div
                            key={contact._id}
                            onClick={() => onSelect(contact)}
                            className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900 ${
                                contact._id === selectedId ? 'bg-blue-100 dark:bg-blue-800' : ''
                            }`}
                        >
                            <div>
                                <div className="font-medium text-sm">{contact.prenom} {contact.nom}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                                    {isFile
                                        ? `${icon} ${contact.lastMessage}`
                                        : contact.lastMessage || (filter === 'contacts' ? contact.email : 'New message')}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {unreadMap[contact._id] > 0 && (
                                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {unreadMap[contact._id]}
                  </span>
                                )}
                                <div className="text-xs text-gray-400">{contact.lastHour || ''}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ConversationList;
