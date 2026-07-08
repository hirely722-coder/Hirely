import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

interface AdminAppContextType {
  user: any | null;
  isSuperAdmin: boolean;
  isLoading: boolean;
  toast: { text: string; type: 'success' | 'error' } | null;
  showToast: (text: string, type?: 'success' | 'error') => void;
  logout: () => Promise<void>;
}

const AdminAppContext = createContext<AdminAppContextType | undefined>(undefined);

export const AdminAppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load user session and verify super admin status from database
  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        // Fetch profile to verify is_super_admin
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('id', session.user.id)
          .single();

        if (!error && profile?.is_super_admin) {
          setIsSuperAdmin(true);
        } else {
          setIsSuperAdmin(false);
        }
      } else {
        setUser(null);
        setIsSuperAdmin(false);
      }
    } catch (err) {
      console.error('Error fetching session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('id', session.user.id)
          .single();
        setIsSuperAdmin(!!profile?.is_super_admin);
      } else {
        setUser(null);
        setIsSuperAdmin(false);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsSuperAdmin(false);
      showToast('Successfully logged out');
    } catch (err) {
      showToast('Failed to log out', 'error');
    }
  };

  return (
    <AdminAppContext.Provider value={{ user, isSuperAdmin, isLoading, toast, showToast, logout }}>
      {children}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[9999] px-4 py-3 rounded-lg shadow-lg border text-xs font-semibold flex items-center gap-2 animate-slide-in ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-100' 
            : 'bg-rose-50 text-rose-800 border-rose-200 shadow-rose-100'
        }`}>
          {toast.type === 'success' ? (
            <div className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">✓</div>
          ) : (
            <div className="h-4 w-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">!</div>
          )}
          <span>{toast.text}</span>
        </div>
      )}
    </AdminAppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AdminAppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AdminAppContextProvider');
  }
  return context;
};
