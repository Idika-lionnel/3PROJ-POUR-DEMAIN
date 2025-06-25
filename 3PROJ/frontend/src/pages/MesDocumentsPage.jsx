import React, { useEffect, useState } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import Layout from '../components/Layout';

const MesDocumentsPage = () => {
    const { token } = useAuthStore();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all'); // all | image | file

    // Chargement des documents depuis l’API
    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                const res = await axios.get('http://localhost:5050/users/documents', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setDocuments(res.data);
            } catch (err) {
                console.error('Erreur chargement documents :', err.response?.data || err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchDocuments();
    }, []);

    // Filtres combinés texte + type
    const filteredDocuments = documents.filter((doc) => {
        const keyword = search.toLowerCase();
        const name = (doc.attachmentUrl || '').toLowerCase();
        const channel = (doc.channelName || '').toLowerCase();
        const sender = (doc.senderName || '').toLowerCase();

        const matchesFilter =
            filterType === 'all' || doc.fileType === filterType;

        return (
            matchesFilter &&
            (name.includes(keyword) || channel.includes(keyword) || sender.includes(keyword))
        );
    });

    return (
        <Layout>
            <div className="max-w-4xl mx-auto px-4 py-6 text-black dark:text-white">
                <h1 className="text-2xl font-bold mb-4">📁 Mes documents</h1>

                <div className="flex items-center justify-between mb-4">
                    <input
                        type="text"
                        placeholder="Rechercher un document..."
                        className="w-2/3 p-2 rounded border dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="ml-4 p-2 border rounded dark:bg-gray-800 dark:text-white"
                    >
                        <option value="all">📦 Tous</option>
                        <option value="image">🖼️ Images</option>
                        <option value="file">📄 Documents</option>
                    </select>
                </div>

                {loading ? (
                    <div className="text-center text-gray-500">Chargement...</div>
                ) : filteredDocuments.length === 0 ? (
                    <div className="text-center text-gray-500">Aucun document trouvé</div>
                ) : (
                    <div className="space-y-4">
                        {filteredDocuments.map((doc, index) => {
                            const fileName = (doc.attachmentUrl || '').split('/').pop();
                            const icon = doc.fileType === 'image' ? '🖼️' : '📄';

                            return (
                                <div
                                    key={`${doc.attachmentUrl}-${index}`}
                                    className="bg-white dark:bg-gray-800 p-4 rounded shadow flex justify-between items-center"
                                >
                                    <div>
                                        <div className="font-semibold truncate max-w-xs">
                                            {icon} {fileName}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {doc.category === 'channel' && `📢 Canal : ${doc.channelName}`}
                                            {doc.category === 'direct' && `💬 Messagerie Directe : ${doc.senderName || 'Inconnu'}`}
                                        </div>
                                    </div>
                                    <a
                                        href={doc.attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-red-600 hover:underline text-sm"
                                    >
                                        Ouvrir
                                    </a>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default MesDocumentsPage;
