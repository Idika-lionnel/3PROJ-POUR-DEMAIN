import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import useAuthStore from '../store/authStore';
import axios from 'axios';
import { useEffect } from 'react';
import socket from '../socket';

const ProfilePage = () => {
  const { user, token, updateUser } = useAuthStore();
  const [formData, setFormData] = useState({
    prenom: user?.prenom || '',
    nom: user?.nom || '',
    email: user?.email || '',
    password: '',
  });



  useEffect(() => {
    if (!user?._id) return;

    socket.emit('identify', user._id); // 👈 important pour le disconnect
    socket.emit('user_connected', { userId: user._id });

    socket.on('status_updated', ({ userId, status }) => {
      if (userId === user._id) {
        setStatus(status); // 👈 met à jour le champ <select>
      }
    });

    return () => {
      socket.off('status_updated');
    };
  }, [user?._id]);


  const [status, setStatus] = useState(user?.status || 'online');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);

    try {
      const res = await axios.put('http://localhost:5050/api/users/status', { status: newStatus }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      updateUser(res.data);
    } catch (err) {
      console.error('❌ Erreur mise à jour statut :', err);
      alert("Erreur lors de la mise à jour du statut.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.put('http://localhost:5050/api/users/update', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert("✅ Profil mis à jour avec succès !");
      updateUser(res.data);
      setFormData(prev => ({ ...prev, password: '' }));
    } catch (err) {
      console.error('❌ Erreur mise à jour profil :', err);
      alert("Erreur lors de la mise à jour du profil.");
    }
  };

  const handleExport = async () => {
    try {
      const res = await axios.get('http://localhost:5050/api/users/export', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'mes_donnees.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Erreur lors de l'exportation des données.");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("⚠️ Es-tu sûr de vouloir supprimer ton compte ? Cette action est irréversible.");
    if (!confirmDelete) return;

    try {
      await axios.delete('http://localhost:5050/api/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert("Compte supprimé avec succès.");
      localStorage.clear();
      window.location.href = "/login";
    } catch (err) {
      console.error("Erreur suppression de compte :", err);
      alert("Erreur lors de la suppression du compte.");
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100 dark:bg-black text-black dark:text-white">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto pl-[80px]">
        <h2 className="text-gray-500 dark:text-gray-300 mb-6">Page profil</h2>

        <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-md p-8 max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold">{user.prenom} {user.nom}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-300">{user.role}</p>
            </div>
            <div className="text-4xl text-gray-600 dark:text-gray-300">
              👤
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block font-medium mb-1">Prénom :</label>
              <input
                type="text"
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                className="w-full border dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-4 py-2 rounded"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Nom :</label>
              <input
                type="text"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                className="w-full border dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-4 py-2 rounded"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Email :</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-4 py-2 rounded"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Mot de passe :</label>
              <input
                type="password"
                name="password"
                placeholder="Nouveau mot de passe (facultatif)"
                value={formData.password}
                onChange={handleChange}
                className="w-full border dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-4 py-2 rounded"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Statut :</label>
              <select
                value={status}
                onChange={handleStatusChange}
                className="w-full border dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-4 py-2 rounded"
              >
                <option value="online">🟢 En ligne</option>
                <option value="busy">🔴 Occupé</option>
                <option value="offline">⚫ Hors ligne</option>
              </select>
            </div>

            <div className="flex justify-between mt-6">
              <button
                type="button"
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded hover:bg-gray-300"
                onClick={() => setFormData({
                  prenom: user?.prenom || '',
                  nom: user?.nom || '',
                  email: user?.email || '',
                  password: '',
                })}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded"
              >
                Enregistrer
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={handleExport}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
            >
              📦 Exporter mes données (RGPD)
            </button>

            <div className="mt-4">
              <button
                onClick={handleDeleteAccount}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
              >
                🗑️ Supprimer mon compte
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;