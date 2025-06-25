import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    try {
      const res = await axios.post('http://localhost:5050/auth/login', { email, password });
      const { token, user } = res.data;
      setAuth(user, token);
      navigate('/dashboard');
    } catch (err) {
      setError('Email ou mot de passe incorrect');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (token) {
      axios
        .get('http://localhost:5050/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          setAuth(res.data.user, token);
          navigate('/dashboard');
        })
        .catch(() => {
          setError("Échec de la connexion via OAuth");
        });
    }
  }, [location, navigate, setAuth]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-blue-600 dark:bg-black overflow-hidden">
      <div className="bg-white dark:bg-[#1e293b] p-8 rounded-xl shadow-md w-full max-w-md text-center text-black dark:text-white">
        <h1 className="text-2xl font-bold text-blue-700 dark:text-white mb-6">
          Connexion à SUPCHAT
        </h1>

        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 border rounded mb-4 bg-white dark:bg-gray-800 dark:text-white dark:border-gray-700"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Mot de passe"
          className="w-full p-2 border rounded mb-4 bg-white dark:bg-gray-800 dark:text-white dark:border-gray-700"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          Se connecter
        </button>

        <button
          onClick={() => (window.location.href = 'http://localhost:5050/auth/google')}
          className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 mt-3"
        >
          Se connecter avec Google
        </button>

        <button
          onClick={() => (window.location.href = 'http://localhost:5050/auth/github')}
          className="w-full bg-gray-800 text-white py-2 rounded hover:bg-gray-900 mt-3"
        >
          Se connecter avec GitHub
        </button>

        <p className="mt-4 text-sm">
          Pas encore de compte ?{' '}
          <Link
            to="/register"
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
          >
            Inscription
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;