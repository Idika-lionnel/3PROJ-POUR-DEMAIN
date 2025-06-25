import { useEffect, useContext } from 'react';
import socket from '../socket';
import { AuthContext } from '../context/AuthContext'; // ✅ BON CONTEXTE POUR MOBILE

const SocketStatusManager = () => {
  const { user, updateUser } = useContext(AuthContext); // ✅ utiliser useContext, pas useAuthStore

  useEffect(() => {
    if (!user?._id) return;

    // Identification Socket
    socket.emit('identify', user._id);
    socket.emit('user_connected', { userId: user._id });

    // Mise à jour dynamique du statut
    socket.on('status_updated', ({ userId, status }) => {
      if (userId === user._id) {
        updateUser({ status });
      }
    });

    return () => {
      socket.off('status_updated');
    };
  }, [user?._id]);

  return null;
};

export default SocketStatusManager;
