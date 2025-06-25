
import { useEffect, useState } from 'react';
import axios from 'axios';
import useAuthStore from '../src/store/authStore';

export function useChannelMap(workspaceId) {
    const [channelMap, setChannelMap] = useState({});
    const { token } = useAuthStore();
    if (!workspaceId) {
        console.warn("⛔️ Aucun workspaceId fourni à useChannelMap");
        return {};
    }
    useEffect(() => {
        console.log("🧠 useChannelMap monté avec workspaceId =", workspaceId);

        async function fetchChannels() {
            try {
                const res = await axios.get(`http://localhost:5050/api/workspaces/${workspaceId}/channels`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const map = {};
                console.log("🧾 Données reçues de l'API :", res.data);
                res.data.forEach((channel) => {
                    const nameKey = channel.name?.toLowerCase().trim();
                    if (nameKey) {
                        map[nameKey] = channel._id;
                    }
                });

                console.log("📡 channelMap chargé :", map);
                setChannelMap(map);
            } catch (err) {
                console.error('❌ Erreur chargement canaux :', err);
            }
        }

        if (workspaceId && token) {
            fetchChannels();
        }
    }, [workspaceId, token]);

    return channelMap;
}
