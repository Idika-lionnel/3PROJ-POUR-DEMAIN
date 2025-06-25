import axios from 'axios';
import { API_URL } from '../config';

export const fetchUserWorkspaces = async (token) => {
  const res = await axios.get(`${API_URL}/api/workspaces`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};