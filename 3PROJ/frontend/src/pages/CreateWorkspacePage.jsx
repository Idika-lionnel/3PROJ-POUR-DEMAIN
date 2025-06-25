import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import Sidebar from '../components/Sidebar';

function CreateWorkspacePage() {
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Le nom est requis');
      return;
    }

    try {
      await axios.post(
        'http://localhost:5050/api/workspaces',
        {
          name,
          isPrivate: visibility === 'private',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      navigate('/workspaces');
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la création de l'espace");
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center px-4 bg-gray-100 dark:bg-black text-black dark:text-white">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md w-full max-w-md">
          <h1 className="text-xl font-bold mb-4 text-blue-700 dark:text-white">
            Créer un espace de travail
          </h1>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300">
                Nom de l'espace
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 dark:text-white"
                placeholder="Ex: Projet Marketing"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="Courte description"
                  rows={1}
              />

            </div>


            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300">
                Visibilité
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="public">Public</option>
                <option value="private">Privé</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Créer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateWorkspacePage;