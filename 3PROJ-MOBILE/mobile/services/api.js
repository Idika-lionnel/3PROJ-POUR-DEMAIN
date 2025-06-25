import axios from 'axios';
import { API_URL } from '../config';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000,
});

export default api;