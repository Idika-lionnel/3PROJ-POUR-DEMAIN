import React, { useEffect, useState } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';

const ChannelChat = ({ channelId }) => {
  const { token, user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`http://localhost:5050/api/channel-messages/${channelId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(res.data);
      } catch (err) {
        console.error('Erreur chargement messages', err);
      }
    };
    if (channelId) fetchMessages();
  }, [channelId, token]);

  const handleSend = async () => {
    if (!input.trim()) return;
    try {
      const res = await axios.post(
        'http://localhost:5050/api/channel-messages',
        { channelId, content: input },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages([...messages, res.data]);
      setInput('');
    } catch {
      alert('Erreur envoi message');
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow mt-6">
      <div className="h-64 overflow-y-auto mb-4 border p-2 dark:border-gray-600">
        {messages.map((msg) => (
          <div key={msg._id} className="mb-2">
            <strong>{msg.senderId.prenom} {msg.senderId.nom}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 px-4 py-2 border dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écrire un message..."
        />
        <button onClick={handleSend} className="bg-blue-600 text-white px-4 rounded">Envoyer</button>
      </div>
    </div>
  );
};

export default ChannelChat;