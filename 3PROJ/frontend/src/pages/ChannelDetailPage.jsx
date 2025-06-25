import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import Layout from '../components/Layout';

function ChannelDetailPage() {
    const { channelId } = useParams();
    const navigate = useNavigate();
    const { token, user } = useAuthStore();

    const [channel, setChannel] = useState(null);
    const [workspaceMembers, setWorkspaceMembers] = useState([]);
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState({ name: '', description: '', isPrivate: false });
    const [error, setError] = useState('');

    const isOwner = channel && String(channel.createdBy) === String(user._id);
    const workspaceId = channel?.workspace;
    const [isMember, setIsMember] = useState(false);

    useEffect(() => {
        const fetchChannel = async () => {
            try {
                const res = await axios.get(`http://localhost:5050/api/channels/${channelId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setChannel(res.data);
                const isMember = res.data.members.some(m => String(m._id) === String(user._id));
                setIsMember(isMember);
                setEditData({
                    name: res.data.name,
                    description: res.data.description || '',
                    isPrivate: res.data.isPrivate || false,
                });

                // Charger les membres du workspace (pour ajout)
                const workspaceId = res.data.workspace;
                const wsRes = await axios.get(`http://localhost:5050/api/workspaces/${workspaceId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setWorkspaceMembers(wsRes.data.members);
            } catch (err) {
                setError("Erreur lors du chargement du canal");
            }
        };

        if (token && channelId) fetchChannel();
    }, [channelId, token]);

    const handleRemoveMember = async (memberId) => {
        if (!memberId) return;
        try {
            const res = await axios.delete(
                `http://localhost:5050/api/channels/${channelId}/members/${memberId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            // ⚠️ Mise à jour immédiate des membres sans refetch
            setChannel((prev) => ({
                ...prev,
                members: prev.members.filter((m) => m._id !== memberId),
            }));
        } catch {
            setError('Erreur suppression membre du canal');
        }
    };


    const handleDeleteChannel = async () => {
        try {
            const res = await axios.delete(`http://localhost:5050/api/channels/${channelId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // ✅ Priorité au canal recréé ou existant
            if (res.data.fallbackChannelId) {
                navigate(`/workspaces/${workspaceId}/channels/${res.data.fallbackChannelId}`);
            } else if (res.data.nextChannelId) {
                navigate(`/workspaces/${workspaceId}/channels/${res.data.nextChannelId}`);
            } else {
                navigate(`/workspaces/${workspaceId}`);
            }
        } catch {
            setError('Erreur suppression du canal');
        }
    };


    const handleSave = async () => {
        try {
            await axios.patch(
                `http://localhost:5050/api/channels/${channelId}`,
                editData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setChannel({ ...channel, ...editData });
            setEditMode(false);
        } catch {
            setError("Erreur mise à jour canal");
        }
    };

    const handleAddMember = async () => {
        if (!newMemberEmail) return;
        try {
            const res = await axios.post(
                `http://localhost:5050/api/channels/${channelId}/members-by-email`,
                { email: newMemberEmail },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setChannel((prev) => ({
                  ...prev,
                  members: res.data.members,
                }));
            setNewMemberEmail('');
        } catch {
            setError('Erreur ajout membre au canal');
        }
    };

    if (!channel) {
        return (
            <Layout>
                <div className="text-red-500 p-6">{error || "Chargement..."}</div>
            </Layout>
        );
    }
    if (!isMember && channel.isPrivate) {
        return (
            <Layout>
                <div className="text-red-500 p-6">Ce canal est privé. Vous n'y avez pas accès.</div>
            </Layout>
        );
    }


    return (
        <Layout>
            <div className="max-w-3xl mx-auto mt-8 bg-white dark:bg-gray-900 shadow-md rounded-lg p-6">
                {/* Infos Canal */}
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
                                channel.name
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
                                channel.description || "Aucune description"
                            )}
                        </p>
                        <p className="mt-1 text-sm italic text-gray-500">
                            {editMode ? (
                                <select
                                    value={editData.isPrivate}
                                    onChange={(e) => setEditData({ ...editData, isPrivate: e.target.value === 'true' })}
                                    className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white px-2 py-1 rounded"
                                >
                                    <option value="false">Public</option>
                                    <option value="true">Privé</option>
                                </select>
                            ) : channel.isPrivate ? "Privé" : "Public"}
                        </p>
                    </div>

                    {isOwner && (
                        <div className="space-x-2">
                            {editMode ? (
                                <>
                                    <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-1 rounded">💾 Enregistrer</button>
                                    <button onClick={() => setEditMode(false)} className="text-gray-500 px-3 py-1">Annuler</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setEditMode(true)} className="bg-yellow-500 text-white px-4 py-1 rounded">✏️ Modifier</button>
                                    <button onClick={handleDeleteChannel} className="bg-red-600 text-white px-4 py-1 rounded">🗑️ Supprimer</button>
                                </>
                            )}
                        </div>
                    )}

                </div>
                {/* Membres du  Canal */}
                {channel.members.map((member) => (
                    <li key={member._id} className="flex justify-between text-sm bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded">
                    <span className="text-gray-700 dark:text-gray-200">
                      {member.prenom} {member.nom}
                    </span>
                                        {isOwner && member._id !== user._id && (
                                            <button
                                                onClick={() => handleRemoveMember(member._id)}
                                                className="text-red-500 text-xs"
                                            >
                                                Retirer
                                            </button>
                                        )}
                                    </li>
                                ))}


                {/* Ajouter un membre (réservé au créateur) */}
                {isOwner && (
                    <div className="mt-6">
                        <h4 className="font-medium text-gray-700 dark:text-white mb-2">➕ Inviter un membre du workspace</h4>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={newMemberEmail}
                                onChange={(e) => setNewMemberEmail(e.target.value)}
                                placeholder="email@exemple.com"
                                className="flex-1 px-3 py-2 border rounded dark:bg-gray-800 dark:text-white"
                            />
                            <button onClick={handleAddMember} className="bg-green-600 text-white px-4 py-2 rounded">
                                Ajouter
                            </button>
                        </div>
                    </div>
                )}

                {/* Bouton retour */}
                <div className="mt-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded flex justify-center"
                    >
                        Retour
                    </button>
                </div>
            </div>
        </Layout>
    );
}

export default ChannelDetailPage;
