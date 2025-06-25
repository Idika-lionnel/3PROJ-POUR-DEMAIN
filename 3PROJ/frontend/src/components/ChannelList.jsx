import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';

const ChannelList = () => {
  const { id: workspaceId } = useParams();
  const { user, token } = useAuthStore();
  const [channels, setChannels] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await axios.get(
            `http://localhost:5050/api/workspaces/${workspaceId}/channels`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // 🔒 Filtrage personnalisé
        const visibleChannels = res.data.filter((channel) => {
          const isMember = channel.members?.some((m) => String(m._id) === String(user._id));
          const isPublic = channel.isPrivate === false;
          return isPublic || isMember;
        });

        setChannels(visibleChannels);
      } catch (err) {
        console.error('Erreur chargement canaux :', err);
      }
    };

    if (workspaceId && token && user?._id) {
      fetchChannels();
    }
  }, [workspaceId, token, user?._id]);

  return (
    <div className="w-full p-4 border-r dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
      <h2 className="text-lg font-bold mb-4 text-black dark:text-white">📂 Mes Canaux</h2>
      <ul className="space-y-2">
        {channels.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Aucun canal visible</p>
        ) : (
          channels.map((ch) => (
            <li
              key={ch._id}
              onClick={() => navigate(`/workspaces/${workspaceId}/channels/${ch._id}`)}
              className="cursor-pointer text-sm text-blue-500 hover:underline"
            >
              # {ch.name}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default ChannelList;