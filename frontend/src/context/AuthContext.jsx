import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await API.post('/auth/login', { email, password });
      if (data.success) {
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        setUser(data.data.user);
        toast.success(`Welcome back, ${data.data.user.name}!`);
        navigate('/dashboard');
        return true;
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed';
      toast.error(msg);
      return false;
    }
  };

  const logout = () => {
    API.post('/auth/logout').catch(() => {});
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const isAdmin = user?.role === 'ADMIN';
  const isLibrarian = user?.role === 'LIBRARIAN';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isLibrarian, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
