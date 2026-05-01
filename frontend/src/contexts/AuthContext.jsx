import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadSession() {
    try {
      const currentUser = await authApi.me();
      setUser(currentUser);
      setProfile(currentUser);
    } catch (error) {
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSession();
  }, []);

  async function signUp(email, password, name, role = 'member') {
    const createdUser = await authApi.signup(name, email, password, role);
    setUser(createdUser);
    setProfile(createdUser);
    return createdUser;
  }

  async function signIn(email, password) {
    const loggedInUser = await authApi.login(email, password);
    setUser(loggedInUser);
    setProfile(loggedInUser);
    return loggedInUser;
  }

  async function signOut() {
    await authApi.logout();
    setUser(null);
    setProfile(null);
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
