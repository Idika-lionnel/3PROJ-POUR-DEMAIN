import React, { useEffect, useState } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';

const MentionsPage = () => {
    const { token } = useAuthStore();
    const user = useAuthStore((state) => state.user);
    const [mentions, setMentions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMentions = async () => {
            try {
                const res = await axios.get('http://localhost:5050/api/mentions', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setMentions(res.data);
            } catch (err) {
                console.error('Erreur chargement mentions :', err);
            } finally {
                setLoading(false);
            }
        };
        fetchMentions();
    }, []);

    const filtered = mentions.filter((m) =>
        (m.content || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Layout>
            <div className="max-w-4xl mx-auto px-4 py-6 text-black dark:text-white">
                <h1 className="text-2xl font-bold mb-4">🔔 Mes mentions</h1>

                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Rechercher une mention..."
                        className="w-full p-2 rounded border dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="text-center text-gray-500">Chargement...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center text-gray-500">Aucune mention trouvée</div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((mention, i) => (
                            <div
                                key={mention._id || i}
                                className="bg-white dark:bg-gray-800 p-4 rounded shadow"
                            >
                                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                                    📢 Canal : <strong>{mention.channelName}</strong> —{' '}
                                    <span className="text-xs">
                                        {new Date(mention.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <div className="mb-2">
                                    {mention.content}
                                </div>
                                <button
                                    onClick={() =>
                                        navigate(
                                            `/workspaces/${mention.workspaceId}/channels/${mention.channelId}?scrollTo=${mention.messageId}`
                                        )
                                    }
                                    className="text-red-600 hover:underline text-sm"
                                >
                                    Voir le message
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default MentionsPage;
