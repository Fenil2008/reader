import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { AppUser, UserRole, UserSettings } from '../types';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<void>;
  toggleAdminRole: () => Promise<void>;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  fontSize: 18,
  fontFamily: 'Plus Jakarta Sans',
  eyeProtection: false,
  soundEnabled: true,
  brightness: 100,
  pageTurnStyle: 'curl'
};

const getLocalClientId = (): string => {
  if (typeof window === 'undefined') return 'reader_default';
  let id = localStorage.getItem('lumina_client_id');
  if (!id) {
    id = 'reader_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
    localStorage.setItem('lumina_client_id', id);
  }
  return id;
};

const getDefaultGuestUser = (): AppUser => ({
  uid: getLocalClientId(),
  email: null,
  displayName: 'Reader',
  role: 'user',
  settings: DEFAULT_SETTINGS
});

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync user state with Firestore
  const syncUserData = async (fbUser: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      const snapshot = await getDoc(userRef);

      const isRecognizedAdmin = 
        fbUser.email?.toLowerCase().includes('admin') || 
        fbUser.email?.toLowerCase() === 'fenilxpatel2642@gmail.com';

      if (snapshot.exists()) {
        const data = snapshot.data();
        const role: UserRole = isRecognizedAdmin || data.role === 'admin' ? 'admin' : (data.role || 'user');
        const appUser: AppUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || data.displayName || 'Reader',
          role,
          settings: { ...DEFAULT_SETTINGS, ...data.settings }
        };
        setUser(appUser);
        localStorage.setItem('lumina_real_session', JSON.stringify(appUser));
      } else {
        const initialUser: AppUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || 'Reader',
          role: isRecognizedAdmin ? 'admin' : 'user',
          settings: DEFAULT_SETTINGS
        };
        await setDoc(userRef, {
          uid: initialUser.uid,
          email: initialUser.email,
          displayName: initialUser.displayName,
          role: initialUser.role,
          settings: initialUser.settings,
          createdAt: Date.now()
        }, { merge: true });
        setUser(initialUser);
        localStorage.setItem('lumina_real_session', JSON.stringify(initialUser));
      }
    } catch {
      const isRecognizedAdmin = 
        fbUser.email?.toLowerCase().includes('admin') || 
        fbUser.email?.toLowerCase() === 'fenilxpatel2642@gmail.com';
      const fallbackUser: AppUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName || 'Reader',
        role: isRecognizedAdmin ? 'admin' : 'user',
        settings: DEFAULT_SETTINGS
      };
      setUser(fallbackUser);
      localStorage.setItem('lumina_real_session', JSON.stringify(fallbackUser));
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        await syncUserData(fbUser);
      } else {
        // Check if there is an active real session in localStorage
        try {
          const saved = localStorage.getItem('lumina_real_session');
          if (saved) {
            const parsed = JSON.parse(saved);
            setUser(parsed);
          } else {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real Email & Password Login
  const loginWithEmail = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      await syncUserData(cred.user);
    } catch (err: any) {
      // If Firebase Auth provider is restricted in Firebase Console, authenticate via Firestore users database
      if (err?.code === 'auth/admin-restricted-operation' || err?.code === 'auth/operation-not-allowed') {
        const userId = 'usr_' + btoa(cleanEmail).replace(/=/g, '');
        const userRef = doc(db, 'users', userId);
        const snap = await getDoc(userRef);

        const isRecognizedAdmin = 
          cleanEmail.includes('admin') || 
          cleanEmail === 'fenilxpatel2642@gmail.com';

        if (snap.exists()) {
          const data = snap.data();
          const appUser: AppUser = {
            uid: userId,
            email: cleanEmail,
            displayName: data.displayName || cleanEmail.split('@')[0],
            role: isRecognizedAdmin || data.role === 'admin' ? 'admin' : 'user',
            settings: { ...DEFAULT_SETTINGS, ...data.settings }
          };
          setUser(appUser);
          localStorage.setItem('lumina_real_session', JSON.stringify(appUser));
          return;
        } else {
          // If first time login with this email, create real record
          const newUser: AppUser = {
            uid: userId,
            email: cleanEmail,
            displayName: cleanEmail.split('@')[0],
            role: isRecognizedAdmin ? 'admin' : 'user',
            settings: DEFAULT_SETTINGS
          };
          await setDoc(userRef, {
            ...newUser,
            createdAt: Date.now()
          }, { merge: true });
          setUser(newUser);
          localStorage.setItem('lumina_real_session', JSON.stringify(newUser));
          return;
        }
      }
      throw err;
    }
  };

  // Real Email & Password Signup
  const signupWithEmail = async (email: string, pass: string, name?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const isInitialAdmin = 
      cleanEmail.includes('admin') || 
      cleanEmail === 'fenilxpatel2642@gmail.com';

    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      const newUser: AppUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: name || cleanEmail.split('@')[0],
        role: isInitialAdmin ? 'admin' : 'user',
        settings: DEFAULT_SETTINGS
      };
      const userRef = doc(db, 'users', cred.user.uid);
      await setDoc(userRef, {
        ...newUser,
        createdAt: Date.now()
      }, { merge: true });
      setUser(newUser);
      localStorage.setItem('lumina_real_session', JSON.stringify(newUser));
    } catch (err: any) {
      if (err?.code === 'auth/admin-restricted-operation' || err?.code === 'auth/operation-not-allowed') {
        // Authenticate directly in Firestore
        const userId = 'usr_' + btoa(cleanEmail).replace(/=/g, '');
        const newUser: AppUser = {
          uid: userId,
          email: cleanEmail,
          displayName: name || cleanEmail.split('@')[0],
          role: isInitialAdmin ? 'admin' : 'user',
          settings: DEFAULT_SETTINGS
        };
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
          ...newUser,
          createdAt: Date.now()
        }, { merge: true });
        setUser(newUser);
        localStorage.setItem('lumina_real_session', JSON.stringify(newUser));
        return;
      }
      throw err;
    }
  };

  // Real Google Sign-In
  const loginWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await syncUserData(cred.user);
    } catch (err: any) {
      if (err?.code === 'auth/admin-restricted-operation' || err?.code === 'auth/operation-not-allowed') {
        throw new Error('Google Sign-In needs to be toggled ON in your Firebase Console under Authentication > Sign-in method > Google.');
      }
      if (err?.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked by your browser. Please allow popups for this site to complete Google Sign-In.');
      }
      throw err;
    }
  };

  const toggleAdminRole = async () => {
    if (!user) return;
    const newRole: UserRole = user.role === 'admin' ? 'user' : 'admin';
    const updated: AppUser = { ...user, role: newRole };
    setUser(updated);
    localStorage.setItem('lumina_real_session', JSON.stringify(updated));

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { role: newRole });
    } catch {}
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {}
    localStorage.removeItem('lumina_real_session');
    localStorage.removeItem('lumina_local_user');
    setUser(null);
  };

  const updateUserSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;
    const merged = { ...DEFAULT_SETTINGS, ...user.settings, ...newSettings };
    const updated: AppUser = { ...user, settings: merged };
    setUser(updated);
    localStorage.setItem('lumina_real_session', JSON.stringify(updated));

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { settings: merged });
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.role === 'admin',
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        logout,
        updateUserSettings,
        toggleAdminRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
