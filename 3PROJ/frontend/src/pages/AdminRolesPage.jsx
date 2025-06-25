import { useEffect, useState } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

function AdminRolesPage() {
  const { token, user } = useAuthStore((state) => ({
    token: state.token,
    user: state.user
  }));
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState({});

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    axios.get('http://localhost:5050/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setUsers(res.data);
      const initialRoles = {};
      res.data.forEach(u => {
        initialRoles[u._id] = u.role;
      });
      setRoles(initialRoles);
    })
    .catch(() => {
      alert("Erreur lors du chargement des utilisateurs.");
    });
  }, [user, token, navigate]);

  const handleRoleChange = (id, newRole) => {
    setRoles({ ...roles, [id]: newRole });
  };

  const updateRole = (id) => {
    axios.patch(`http://localhost:5050/admin/users/${id}/role`, { role: roles[id] }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(() => {
      alert("Rôle mis à jour !");
    })
    .catch(() => {
      alert("Erreur lors de la mise à jour du rôle.");
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto pl-[80px]">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-6 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-600"
        >
          ← Retour au Dashboard
        </button>

        <h1 className="text-2xl font-bold mb-6">Gestion des rôles</h1>

        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-800 text-left">
              <th className="p-2">Nom</th>
              <th className="p-2">Email</th>
              <th className="p-2">Rôle</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id} className="border-b dark:border-gray-600">
                <td className="p-2">{u.prenom} {u.nom}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">
                  <select
                    value={roles[u._id]}
                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                    className="border dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white p-1 rounded"
                  >
                    <option value="membre">Membre</option>
                    <option value="admin">Admin</option>
                    <option value="developpeur">Développeur</option>
                  </select>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => updateRole(u._id)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Mettre à jour
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminRolesPage;