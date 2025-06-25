// src/pages/WorkspaceDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import Layout from '../components/Layout';


function WorkspaceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '', isPrivate: false });

  const isOwner = String(workspace?.createdBy?._id) === String(user._id);

  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [channelPrivacy, setChannelPrivacy] = useState(false);
  const isMember = workspace?.members?.some((m) => String(m._id) === String(user._id));


  const handleCreateChannel = async () => {
    if (!channelName) return;

    try {
      await axios.post(
          `http://localhost:5050/api/workspaces/${id}/channels`,
          {
            name: channelName,
            description: channelDescription,
            isPrivate: channelPrivacy === 'true',
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
      );
      setChannelName('');
      setChannelDescription('');
      setChannelPrivacy('false');
    } catch (err) {
      setError('Erreur création canal');
    }
  };


  // Load workspace
  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const res = await axios.get(`http://localhost:5050/api/workspaces/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const ws = res.data;
        setWorkspace(ws);
        setEditData({
          name: ws.name,
          description: ws.description || '',
          isPrivate: ws.isPrivate || false,
        });
      } catch {
        setError('Erreur chargement workspace');
      }
    };
    if (id && token) fetchWorkspace();
  }, [id, token]);

  // Actions
  const handleDelete = async () => {
    try {
      await axios.delete(`http://localhost:5050/api/workspaces/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate('/workspaces');
    } catch {
      setError('Erreur suppression workspace');
    }
  };

  const handleSave = async () => {
    try {
      const res = await axios.patch(
        `http://localhost:5050/api/workspaces/${id}`,
        editData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWorkspace(res.data);
      setEditMode(false);
    } catch {
      setError('Erreur mise à jour');
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail) return;
    try {
      const res = await axios.post(
        `http://localhost:5050/api/workspaces/${id}/members-by-email`,
        { email: newMemberEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWorkspace(res.data);
      setNewMemberEmail('');
    } catch {
      setError('Erreur ajout membre');
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      const res = await axios.delete(
        `http://localhost:5050/api/workspaces/${id}/members/${memberId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWorkspace(res.data);
    } catch {
      setError('Erreur suppression membre');
    }
  };

  if (!workspace) {
    return (
      <Layout>
        <div className="text-red-500">{error || 'Chargement...'}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto mt-8 bg-white dark:bg-gray-900 shadow-md rounded-lg p-6">

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              {editMode ? (
                <input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white px-2 py-1 rounded"
                />
              ) : (
                workspace.name
              )}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {editMode ? (
                <input
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white px-2 py-1 rounded w-full"
                />
              ) : (
                workspace.description || 'Aucune description'
              )}
            </p>
            <p className="mt-1 text-sm italic text-gray-500">
              {editMode ? (
                  <select
                      value={channelPrivacy ? 'true' : 'false'}
                      onChange={(e) => setChannelPrivacy(e.target.value === 'true')}
                      className="px-3 py-2 border rounded dark:bg-gray-800 dark:text-white"
                  >
                    <option value="false">Public</option>
                    <option value="true">Privé</option>
                  </select>
              ) : workspace.isPrivate ? 'Privé' : 'Public'}
            </p>
          </div>

          {isMember && isOwner && (
            <div className="space-x-2">
              {editMode ? (
                <>
                  <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-1 rounded">💾 Enregistrer</button>
                  <button onClick={() => setEditMode(false)} className="text-gray-500 px-3 py-1">Annuler</button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditMode(true)} className="bg-yellow-500 text-white px-4 py-1 rounded">✏️ Modifier</button>
                  <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-1 rounded">🗑️ Supprimer</button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Membres */}
        <div className="mt-8">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">👥 Membres</h3>
          <ul className="space-y-1">
            {workspace.members.map((member) => (
              <li key={member._id} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded">
                <span className="text-gray-700 dark:text-gray-200">{member.prenom} {member.nom}</span>
                {isMember && isOwner && member._id !== user._id && (
                  <button
                    onClick={() => handleRemoveMember(member._id)}
                    className="text-red-500 text-xs"
                  >
                    Retirer
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isMember && isOwner && (
          <div className="mt-6">
            <h4 className="font-medium text-gray-700 dark:text-white mb-2">➕ Ajouter un membre</h4>
            <div className="flex gap-2">
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="email@exemple.com"
                className="flex-1 px-3 py-2 border rounded dark:bg-gray-800 dark:text-white"
              />
              <button onClick={handleAddMember} className="bg-green-600 text-white px-4 py-2 rounded">Ajouter</button>
            </div>
          </div>
        )}


        {isMember && isOwner && (
            <div className="mt-10">
              <h4 className="font-medium text-gray-700 dark:text-white mb-2">💬 Créer un canal</h4>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                    type="text"
                    placeholder="Nom du canal"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded dark:bg-gray-800 dark:text-white"
                />
                <input
                    type="text"
                    placeholder="Description"
                    value={channelDescription}
                    onChange={(e) => setChannelDescription(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded dark:bg-gray-800 dark:text-white"
                />
                <select
                    value={channelPrivacy}
                    onChange={(e) => setChannelPrivacy(e.target.value)}
                    className="px-3 py-2 border rounded dark:bg-gray-800 dark:text-white"
                >
                  <option value="false">Public</option>
                  <option value="true">Privé</option>
                </select>
                <button
                    onClick={handleCreateChannel}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  Ajouter
                </button>
              </div>
            </div>
        )}
        {!isMember && (
            <div className="mt-4">
              <button
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  onClick={async () => {
                    try {
                      // 1. Envoyer la requête pour rejoindre
                      await axios.patch(
                          `http://localhost:5050/api/workspaces/${id}/join`,
                          {},
                          { headers: { Authorization: `Bearer ${token}` } }
                      );

                      // 2. Recharger les données du workspace (avec members)
                      const res = await axios.get(`http://localhost:5050/api/workspaces/${id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      setWorkspace(res.data); // ✅ met à jour correctement `workspace.members`
                    } catch (err) {
                      console.error(err);
                      setError("Erreur en rejoignant le workspace");
                    }
                  }}
              >
                Rejoindre ce workspace
              </button>

            </div>
        )}




        <div className="mt-3">
              <button
                  onClick={() => navigate(-1)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded flex justify-center items-center gap-2"
              >
                Retour
              </button>
            </div>

      </div>

    </Layout>
  );
}

export default WorkspaceDetailPage;