import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import useAuthStore from '../store/authStore';
import axios from 'axios';

const ChannelChatView = () => {
  const { id: workspaceId } = useParams();
  const { token } = useAuthStore();
  const [channels, setChannels] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5050/api/workspaces/${workspaceId}/channels`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setChannels(res.data);

        // 🔁 Si aucun canal sélectionné, on redirige vers le premier canal
        if (res.data.length > 0) {
          navigate(`/workspaces/${workspaceId}/channels/${res.data[0]._id}`, {
            replace: true,
          });
        }
      } catch (err) {
        console.error('Erreur chargement canaux :', err);
      }
    };

    fetchChannels();
  }, [workspaceId, token, navigate]);

  return (
    <Layout>
      <div className="flex h-screen">
        {/* Liste des canaux */}
        <div className="w-64">
          <h2 className="text-xl font-semibold mb-4">📁 Canaux</h2>
          <ul className="space-y-2">
            {channels.map((channel) => (
              <li key={channel._id}>
                <button
                  className="text-left w-full text-blue-400 hover:underline"
                  onClick={() =>
                    navigate(`/workspaces/${workspaceId}/channels/${channel._id}`)
                  }
                >
                  # {channel.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Zone de chat du canal */}
        <div className="flex-1 bg-gray-900 text-white overflow-y-auto h-full">
        <Outlet />
        </div>
      </div>
    </Layout>
  );
};

export default ChannelChatView;