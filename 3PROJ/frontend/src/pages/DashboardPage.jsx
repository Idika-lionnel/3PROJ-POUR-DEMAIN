import { useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const goToAdminPage = () => {
    navigate('/admin/roles');
  };

  const goToDashboard2 = () => {
    navigate('/dashboard2');
  };

  if (!user) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-black text-black dark:text-white">
        <div className="bg-white dark:bg-[#1e293b] p-10 rounded-xl shadow-md text-center">
          <h1 className="text-2xl font-bold text-blue-700 dark:text-white mb-4">
            Bienvenue, {user.prenom} {user.nom} !
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-2">Email : {user.email}</p>
          <p className="text-gray-500 dark:text-gray-400 italic mb-6">Rôle : {user.role}</p>

          {user.role === 'admin' && (
            <button
              onClick={goToAdminPage}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4 w-full"
            >
              Gérer les rôles
            </button>
          )}

          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded"
            >
              Se déconnecter
            </button>
            <button
              onClick={goToDashboard2}
              className="bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 px-6 rounded"
            >
              Accéder au Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;