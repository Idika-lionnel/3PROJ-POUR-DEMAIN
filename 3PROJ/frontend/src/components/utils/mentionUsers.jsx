import axios from 'axios';

export async function fetchMentionableUsers(token) {
    try {
        const res = await axios.get('http://localhost:5050/api/users/all', {
            headers: { Authorization: `Bearer ${token}` },
        });

        // Crée un Set avec les formats "prenom nom" et "nom.prenom"
        const mentionNames = res.data.flatMap(user => [
            `${user.prenom} ${user.nom}`.toLowerCase(),
            `${user.nom}.${user.prenom}`.toLowerCase()
        ]);

        return new Set(mentionNames);
    } catch (err) {
        console.error("Erreur chargement utilisateurs pour mentions :", err);
        return new Set();
    }
}
