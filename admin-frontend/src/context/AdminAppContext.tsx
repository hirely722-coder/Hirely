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

  // Load user session and verify super admin status via Hono backend bootstrap
  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && session.access_token) {
        setUser(session.user);
        
        // Query backend bootstrap to get trusted isSuperAdmin flag
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (!backendUrl) {
          throw new Error('Missing NEXT_PUBLIC_BACKEND_URL environment variable.');
        }
        const response = await fetch(`${backendUrl}/api/bootstrap`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (response.ok) {
          const payload = await response.json();
          setIsSuperAdmin(!!payload.currentUser?.isSuperAdmin);
        } else {
          setIsSuperAdmin(false);
        }
      } else {
        setUser(null);
        setIsSuperAdmin(false);
      }
    } catch (err) {
      console.error('Error fetching session:', err);
      setIsSuperAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user && session.access_token) {
        setUser(session.user);
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
          if (!backendUrl) {
            throw new Error('Missing NEXT_PUBLIC_BACKEND_URL environment variable.');
          }
          const response = await fetch(`${backendUrl}/api/bootstrap`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });
          if (response.ok) {
            const payload = await response.json();
            setIsSuperAdmin(!!payload.currentUser?.isSuperAdmin);
          } else {
            setIsSuperAdmin(false);
          }
        } catch {
          setIsSuperAdmin(false);
        }
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
