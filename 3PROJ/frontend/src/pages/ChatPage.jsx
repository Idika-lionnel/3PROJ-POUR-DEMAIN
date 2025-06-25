import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import SocketTest from '../components/SocketTest';
import ConversationList from '../components/ConversationList';
import socket from '../socket';

const ChatPage = () => {
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [userId, setUserId] = useState(null);
    const [refreshUnread, setRefreshUnread] = useState(false);
    const audioRef = React.useRef(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) setUserId(user._id);
    }, []);

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const token = localStorage.getItem('token');
                const user = JSON.parse(localStorage.getItem('user'));
                const res = await fetch(`http://localhost:5050/api/conversations/${user._id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const data = await res.json();

                const enrichedContacts = data.map(conv => {
                    const other = conv.participants.find(p => p._id !== user._id);
                    return {
                        ...other,
                        lastMessage: conv.lastMessage,
                        lastHour: conv.lastHour
                    };
                });

                setContacts(enrichedContacts);
                if (enrichedContacts.length > 0) {
                    const first = enrichedContacts[0];
                    setSelectedContact(first);

                    // ✅ Marquer comme lu
                    await fetch(`http://localhost:5050/api/messages/mark-read/${first._id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ currentUserId: user._id })
                    });

                    setRefreshUnread(prev => !prev); // 🔁 rafraîchir le badge
                }
            } catch (err) {
                console.error('Erreur chargement conversations :', err);
            }
        };

        const fetchAllUsers = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('http://localhost:5050/users/all', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const data = await res.json();
                setAllUsers(data);
            } catch (err) {
                console.error('Erreur chargement utilisateurs :', err);
            }
        };

        fetchConversations();
        fetchAllUsers();
    }, []);

    useEffect(() => {

        socket.on('new_direct_message', (msg) => {
            if (!userId || (!msg.senderId && !msg.receiverId)) return;


            const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
            const receiverId = typeof msg.receiverId === 'object' ? msg.receiverId._id : msg.receiverId;

            // Conversation concernée
            const otherId = senderId === userId ? receiverId : senderId;

            // Contenu aperçu
            let lastMessagePreview = '[Fichier]';
            if (msg.type === 'text') {
                lastMessagePreview = msg.message || msg.content || '';
            } else if (msg.type === 'file') {
                const name = msg.attachmentUrl?.split('/').pop();
                lastMessagePreview = name ? `📎 ${name}` : '[Fichier]';
            }


            setContacts(prev => {
                const updated = prev.map(c => {
                    if (c._id === otherId) {
                        return {
                            ...c,
                            lastMessage: lastMessagePreview,
                            lastHour: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        };
                    }
                    return c;
                });

                if (!updated.some(c => c._id === otherId)) {
                    const contact = allUsers.find(u => u._id === otherId);
                    if (contact) {
                        updated.unshift({
                            ...contact,
                            lastMessage: lastMessagePreview,
                            lastHour: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        });
                    }
                }

                return updated.sort((a, b) => {
                    const aTime = a.lastHour ? new Date(`1970-01-01T${a.lastHour}:00`) : 0;
                    const bTime = b.lastHour ? new Date(`1970-01-01T${b.lastHour}:00`) : 0;
                    return bTime - aTime;
                });
            });

            //if (selectedContact?._id !== otherId) {
                playNotification(); // Son si la conversation n’est pas ouverte
            //}

            // 🔁 Rafraîchir badge
            setRefreshUnread(prev => !prev);
        });

        return () => {
            socket.off('new_direct_message');
        };
    }, [userId, allUsers,selectedContact]);

    const playNotification = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0; // recommencer depuis le début
            audioRef.current.play().catch(err => {
                console.error(" Lecture audio échouée :", err);
            });
        }
    };


    return (

        <div className="flex h-screen bg-white relative">
            <Sidebar />
            <audio ref={audioRef} src="/notification.mp3" preload="auto" />
            <div className="flex flex-1 pl-[70px]">

                <ConversationList
                    contacts={contacts}
                    selectedId={selectedContact?._id}
                    onSelect={async (contact) => {
                        setSelectedContact(contact);
                        try {
                            await fetch(`http://localhost:5050/api/messages/mark-read/${contact._id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ currentUserId: userId })
                            });
                            setRefreshUnread(prev => !prev); // 🔁 force le rafraîchissement des compteurs
                        } catch (err) {
                            console.error("❌ Erreur mark-as-read :", err);
                        }
                    }}

                    allUsers={allUsers}
                    userId={userId}
                    refreshUnread={refreshUnread}
                />


                <div className="flex-1">
                    {selectedContact && (
                        <SocketTest
                            receiverId={selectedContact._id}
                            contacts={[...contacts, ...allUsers]}
                            setRefreshUnread={setRefreshUnread}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
