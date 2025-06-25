import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore'; // 🔹 pour récupérer le user connecté

const ChannelSection = ({
  workspaceId,
  token,
  isOwner = false,
  onSelectChannel,
  selectedChannelId
}) => {
  const [channels, setChannels] = useState([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuthStore(); // ✅ récupère l'utilisateur connecté

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await axios.get(`http://localhost:5050/api/workspaces/${workspaceId}/channels`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // ✅ Ne garde que les canaux où l'utilisateur est membre
        const filtered = res.data.filter(channel =>
          channel.members?.some(m => m._id === user._id)
        );

        setChannels(filtered);
      } catch (err) {
        setError('Erreur chargement des canaux');
      }
    };
    if (token && workspaceId) fetchChannels();
  }, [workspaceId, token, user._id]);

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    try {
      const res = await axios.post(
        `http://localhost:5050/api/workspaces/${workspaceId}/channels`,
        { name: newChannelName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChannels([...channels, res.data]);
      setNewChannelName('');
    } catch {
      setError('Erreur création canal');
    }
  };

  const handleDeleteChannel = async (channelId) => {
    try {
      await axios.delete(
        `http://localhost:5050/api/workspaces/${workspaceId}/channels/${channelId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChannels(channels.filter(c => c._id !== channelId));
    } catch {
      setError('Erreur suppression canal');
    }
  };

  const handleChannelClick = (channel) => {
    if (onSelectChannel) {
      onSelectChannel(channel);
    } else {
      navigate(`/workspaces/${workspaceId}/channels/${channel._id}`);
    }
  };

  return (
    <div className="mt-8">
      <h3 className="font-semibold mb-2">Canaux de discussion</h3>

      {isOwner && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="Nom du canal"
            className="border dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-3 py-2 w-full"
          />
          <button onClick={handleCreateChannel} className="bg-blue-600 text-white px-4 rounded">
            Ajouter
          </button>
        </div>
      )}

      {channels.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">Aucun canal pour le moment.</p>
      ) : (
        <ul className="space-y-1 text-gray-700 dark:text-gray-300">
          {channels.map((channel) => (
            <li
              key={channel._id}
              onClick={() => handleChannelClick(channel)}
              className={`cursor-pointer px-3 py-2 rounded flex justify-between items-center ${
                selectedChannelId === channel._id
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <span>#{channel.name}</span>
              {isOwner && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChannel(channel._id);
                  }}
                  className="ml-2 text-red-500 hover:text-red-700 text-sm"
                >
                  Supprimer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};

export default ChannelSection;