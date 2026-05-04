import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/users/me')
        .then((res) => setUser(res.data))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  // Step 1: verify credentials → returns { requiresOtp: true, email }
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data; // { requiresOtp: true, email }
  };

  // Step 2: verify OTP → sets token + user
  const verifyOtp = async (email, otp) => {
    const { data } = await api.post('/auth/verify-otp', { email, otp });
    // Don't set token yet — LoginPage will show loading screen first,
    // then call finalizeLogin() at 100% to actually log in
    return data; // { token, user }
  };

  // Called by LoginPage after loading animation completes
  const finalizeLogin = (data) => {
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (username, email, password) => {
    // Create account but do NOT auto-login — user must go through login + OTP
    await api.post('/auth/register', { username, email, password });
    // Don't set token or user — redirect to login handled by LoginPage
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated) => setUser((prev) => ({ ...prev, ...updated }));

  return (
    <AuthContext.Provider value={{ user, token, loading, login, verifyOtp, finalizeLogin, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
