import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';

const WorkspaceChannelRedirectPage = () => {
    const { id: workspaceId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);

    const [loading, setLoading] = useState(true);
    const [hasChannels, setHasChannels] = useState(null);

    useEffect(() => {
        const fetchChannels = async () => {
            try {
                const res = await axios.get(
                    `http://localhost:5050/api/workspaces/${workspaceId}/channels`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const user = JSON.parse(localStorage.getItem('user'));
                const visibleChannels = res.data.filter((channel) => {
                    const isMember = channel.members?.some((m) => String(m._id) === String(user._id));
                    const isPublic = channel.isPrivate === false;
                    return isPublic || isMember;
                });

                if (visibleChannels.length > 0) {
                    navigate(`/workspaces/${workspaceId}/channels/${visibleChannels[0]._id}`);
                } else {
                    setHasChannels(false);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Erreur chargement canaux :', err);
                setHasChannels(false);
                setLoading(false);
            }
        };

        if (workspaceId && token) {
            fetchChannels();
        }
    }, [workspaceId, token, navigate]);

    if (loading) {
        return <div className="p-6 text-center text-gray-600">Chargement du canal...</div>;
    }

    return (
        <div className="p-6 text-center text-gray-700">
            <p>Aucun canal trouvé dans ce workspace.</p>
        </div>
    );
};

export default WorkspaceChannelRedirectPage;
