import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config';
import socket from '../socket';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        if (storedToken) {
          setToken(storedToken);
          // ✅ Appel vers la bonne route
          const res = await axios.get(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          setUser(res.data.user);
        }
      } catch (error) {
        console.error('Erreur AuthContext loadToken :', error.message);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    loadToken();
  }, []);
  useEffect(() => {
    if (!user?._id) return;

    // Rejoindre la room personnelle pour le statut
    socket.emit('join', user._id);

    const handleStatusUpdate = ({ userId, newStatus }) => {
      if (userId === user._id) {
        console.log('🟢 Nouveau statut reçu :', newStatus);
        updateUser({ status: newStatus });
      }
    };

    socket.on('user_status_updated', handleStatusUpdate);

    return () => {
      socket.off('user_status_updated', handleStatusUpdate);
    };
  }, [user?._id]);


  const updateUser = (newData) => {
    setUser(prev => ({ ...prev, ...newData }));
  };

  const login = async (newToken) => {
    try {
      await AsyncStorage.setItem('userToken', newToken);
      setToken(newToken);
      const res = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      setUser(res.data.user);
    } catch (error) {
      console.error('Erreur AuthContext login :', error.message);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Erreur AuthContext logout :', error.message);
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};