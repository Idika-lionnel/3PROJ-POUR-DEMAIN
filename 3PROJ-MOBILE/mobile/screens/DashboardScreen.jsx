import React, { useContext, useEffect, useState } from 'react';
import DashboardMobile from './DashboardMobile';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { API_URL } from '../config';
//const API_URL = 'http://192.168.30.125:5050'; // ⚠️ adapte à ton IP

const DashboardScreen = () => {
  const { token } = useContext(AuthContext);
  const [user, setUser] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => setUser(res.data.user));
  }, [token]);

  if (!user) return null;

  return <DashboardMobile user={user} />;
};

export default DashboardScreen;