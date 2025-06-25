import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';

const WorkspaceListPage = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const [memberRes, publicRes] = await Promise.all([
          axios.get('http://localhost:5050/api/workspaces', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get('http://localhost:5050/api/workspaces/public/all', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const memberWorkspaces = memberRes.data;
        const publicWorkspaces = publicRes.data;

        // Enlever les doublons (public déjà rejoints)
        const publicNotJoined = publicWorkspaces.filter(
            (pub) => !memberWorkspaces.some((m) => String(m._id) === String(pub._id))
        );

        // Fusionner les deux
        setWorkspaces([...memberWorkspaces, ...publicNotJoined]);
      } catch (err) {
        console.error('Erreur lors du chargement des workspaces', err);
      }
    };

    if (token && user?._id) fetchWorkspaces();
  }, [token, user?._id]);

  return (
      <Layout>
        <div className="w-full pl-[70px]">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Espaces de Travail</h1>
            <button
                onClick={() => navigate('/workspaces/create')}
                className="bg-[#0F71D3] text-white px-4 py-2 rounded hover:bg-blue-700 dark:bg-[#0A3A66]  "
            >
              + Créer un workspace
            </button>
          </div>

          {workspaces.length === 0 ? (
              <p>Aucun espace disponible.</p>
          ) : (
              <div className="grid grid-cols-3 gap-4">
                {workspaces.map((ws) => (
                    <div
                        key={ws._id}
                        className=" bg-[#1475DD] dark:bg-[#0A3A66] hover:bg-[#0F71D3] text-white rounded-xl p-6 cursor-pointer transition-colors duration-200"
                        onClick={() => navigate(`/workspaces/${ws._id}/channels`)}
                    >
                      {ws.name}
                    </div>
                ))}
              </div>
          )}
        </div>
      </Layout>
  );
};

export default WorkspaceListPage;
