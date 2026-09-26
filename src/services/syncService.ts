import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import { SyncSession } from '../types';

function sanitizeObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      result[key] = val;
    } else {
      result[key] = null;
    }
  }
  return result;
}

export class SyncService {
  /**
   * Generate 6-digit PIN
   */
  private static generatePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Host creates a new sync session
   */
  static async createSession(
    hostUserId: string,
    hostEmail: string | undefined,
    bookId: string,
    initialPage: number,
    totalPages: number,
    initialCfi?: string
  ): Promise<SyncSession> {
    const pin = this.generatePin();
    const now = Date.now();
    const rawSession: any = {
      pin,
      hostUserId: hostUserId || 'host_user',
      hostEmail: hostEmail || null,
      bookId: bookId || '',
      currentPage: initialPage || 1,
      totalPages: totalPages || 1,
      epubCfi: initialCfi || null,
      status: 'waiting',
      createdAt: now,
      expiresAt: now + 2 * 60 * 60 * 1000, // 2 hours expiry
      lastUpdated: now
    };

    const session = sanitizeObject(rawSession) as SyncSession;

    await setDoc(doc(db, 'sessions', pin), session);
    return session;
  }

  /**
   * Subscribe to session changes (both host and guest)
   */
  static subscribeToSession(
    pin: string, 
    callback: (session: SyncSession | null) => void
  ) {
    if (!pin) {
      callback(null);
      return () => {};
    }
    const docRef = doc(db, 'sessions', pin);
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data() as SyncSession);
      } else {
        callback(null);
      }
    }, () => {
      callback(null);
    });
  }

  /**
   * Host updates page progress in real time
   */
  static async updatePage(pin: string, page: number, cfi?: string): Promise<void> {
    const docRef = doc(db, 'sessions', pin);
    const updateData: any = {
      currentPage: page,
      status: 'active',
      lastUpdated: Date.now()
    };
    if (cfi !== undefined) {
      updateData.epubCfi = cfi || null;
    }
    await updateDoc(docRef, updateData).catch(() => {});
  }

  /**
   * Guest joins session
   */
  static async joinSession(pin: string): Promise<SyncSession | null> {
    const docRef = doc(db, 'sessions', pin);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = snap.data() as SyncSession;
    if (data.status === 'ended') return null;

    if (data.expiresAt < Date.now()) {
      await deleteDoc(docRef).catch(() => {});
      return null;
    }

    return data;
  }

  /**
   * End session
   */
  static async endSession(pin: string): Promise<void> {
    const docRef = doc(db, 'sessions', pin);
    await updateDoc(docRef, {
      status: 'ended',
      lastUpdated: Date.now()
    }).catch(() => {});
  }
}
