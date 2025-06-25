import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import socket from '../socket'; // 👈 à ajouter

const Sidebar = () => {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();

  const [status, setStatus] = useState(user?.status || 'offline'); // 👈 local status

  useEffect(() => {
    if (!user?._id) return;

    socket.on('status_updated', ({ userId, status }) => {
      if (userId === user._id) {
        setStatus(status);
      }
    });

    return () => {
      socket.off('status_updated');
    };
  }, [user?._id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'busy':
        return 'bg-red-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  return (
      <aside className="w-[70px] h-screen bg-[#1475dd] dark:bg-[#0a3a66] flex flex-col items-center justify-between py-4 fixed left-0 top-0 z-50">
        {/* Haut de la barre */}
        <div className="flex flex-col items-center gap-6">
          {/* Profil avec statut */}
          <div className="relative">
            <button
                onClick={() => navigate('/profile')}
                className="w-10 h-10 rounded-full bg-[#124b88] flex items-center justify-center text-white"
                title="Profil"
            >
              <Icon icon="mdi:account" width="24" />
            </button>
            {/* Badge de statut */}
            <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1475dd] ${getStatusColor(status)}`}
            />
          </div>

          {/* Accueil */}
          <NavLink to="/dashboard2" className="text-white" title="Dashboard">
            <Icon icon="ic:round-home" width="28" />
          </NavLink>

          {/* Espaces de travail */}
          <NavLink to="/workspaces" className="text-white" title="Espaces de travail">
            <Icon icon="carbon:workspace" width="28" />
          </NavLink>

          {/* Messages */}
          <NavLink to="/chat" className="text-white" title="Messages">
            <Icon icon="mingcute:message-4-fill" width="28" />
          </NavLink>
        </div>

        {/* Bas de la barre */}
        <div className="flex flex-col items-center gap-4">
          {/* Thème clair/sombre */}
          <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition ${
                  darkMode ? 'bg-[#124b88] text-white' : 'bg-white text-[#1475dd]'
              }`}
              title="Changer de thème"
          >
            <Icon icon={darkMode ? 'ph:moon-fill' : 'ph:sun-fill'} width="20" />
          </button>

          {/* Logout */}
          <button
              onClick={handleLogout}
              className="text-white mt-2"
              title="Se déconnecter"
          >
            <Icon icon="ri:logout-box-r-line" width="24" />
          </button>
        </div>
      </aside>
  );
};

export default Sidebar;
