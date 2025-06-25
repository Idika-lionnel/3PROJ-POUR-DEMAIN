import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    const data = { email, prenom, nom, password };
    console.log("📤 Envoi de l'inscription avec :", data);

    try {
      const res = await axios.post('http://localhost:5050/auth/register', data, {
        headers: { 'Content-Type': 'application/json' },
      });

      console.log("✅ Réponse API :", res.data);
      alert('Compte créé avec succès');
    } catch (err) {
      console.error("❌ Erreur d'inscription :", err);
      console.error("🧾 Détail complet :", err.response?.data || err.message);
      setError(err.response?.data?.error || 'Erreur inconnue');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen overflow-hidden bg-blue-600 dark:bg-black">
      <div className="bg-white dark:bg-[#1e293b] p-8 rounded-xl shadow-md w-full max-w-md text-center text-black dark:text-white">
        <h1 className="text-2xl font-bold text-blue-700 dark:text-white mb-6">Créer un compte</h1>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded mb-4 bg-white dark:bg-gray-800 dark:text-white dark:border-gray-700"
        />
        <input
          type="text"
          placeholder="Prénom"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          className="w-full p-2 border rounded mb-4 bg-white dark:bg-gray-800 dark:text-white dark:border-gray-700"
        />
        <input
          type="text"
          placeholder="Nom"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="w-full p-2 border rounded mb-4 bg-white dark:bg-gray-800 dark:text-white dark:border-gray-700"
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded mb-4 bg-white dark:bg-gray-800 dark:text-white dark:border-gray-700"
        />

        <button
          onClick={handleRegister}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
        >
          S'inscrire
        </button>

        <p className="mt-4 text-sm">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
            Connexion
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;