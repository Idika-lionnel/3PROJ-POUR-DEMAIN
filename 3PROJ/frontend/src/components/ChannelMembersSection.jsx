// src/components/ChannelMembersSection.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';

const ChannelMembersSection = ({ channelId, workspaceId }) => {
  const { user, token } = useAuthStore();
  const [members, setMembers] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [channelCreatorId, setChannelCreatorId] = useState('');

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await axios.get(`http://localhost:5050/api/workspaces/${workspaceId}/channels/${channelId}`);
        setMembers(res.data.members || []);
        setChannelCreatorId(res.data.createdBy._id);
      } catch (err) {
        setError('Erreur chargement membres');
      }
    };
    fetchMembers();
  }, [channelId, workspaceId, token]);

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    try {
      const res = await axios.post(
        `http://localhost:5050/api/workspaces/${workspaceId}/channels/${channelId}/members-by-email`,
        { email: newEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMembers(res.data.members || []);
      setNewEmail('');
      setError('');
    } catch (err) {
      setError('Erreur ajout membre');
    }
  };

  const handleRemove = async (memberId) => {
    try {
      const res = await axios.delete(
        `http://localhost:5050/api/workspaces/${workspaceId}/channels/${channelId}/members/${memberId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMembers(res.data.members || []);
    } catch {
      setError('Erreur suppression membre');
    }
  };

  return (
    <div className="bg-gray-800 text-white w-64 p-4">
      <h3 className="text-md font-semibold mb-2">👥 Membres</h3>
      <ul className="space-y-1 text-sm">
        {members.map((m) => (
          <li key={m._id} className="flex justify-between items-center">
            <span>{m.prenom} {m.nom}</span>
            {user._id === channelCreatorId && m._id !== user._id && (
              <button onClick={() => handleRemove(m._id)} className="text-red-400 text-xs">Retirer</button>
            )}
          </li>
        ))}
      </ul>

      {user._id === channelCreatorId && (
        <div className="mt-4">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@exemple.com"
            className="w-full p-1 text-black"
          />
          <button onClick={handleAdd} className="mt-2 w-full bg-blue-600 text-white px-2 py-1 rounded">Ajouter</button>
        </div>
      )}

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
};

export default ChannelMembersSection;