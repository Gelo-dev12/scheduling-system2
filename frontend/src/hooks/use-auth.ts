import { create } from 'zustand';
import axios from 'axios';

interface User {
  name: string;
  email: string;
  // Add other user fields as needed
}

interface AuthState {
  user: User | null;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set: any) => ({
  user: null,
  error: null,
  login: async (email: string, password: string) => {
    try {
      const response = await axios.post('http://192.168.1.56:3001/api/auth/login', {
        email,
        password,
      }, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });
      set({ user: response.data.user, error: null });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Login failed', user: null });
    }
  },
  logout: () => set({ user: null, error: null }),
}));
