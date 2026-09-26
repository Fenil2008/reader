import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Highlight, StickyNote } from '../types';

export class AnnotationService {
  /**
   * Highlights
   */
  static subscribeToHighlights(
    userId: string, 
    bookId: string, 
    callback: (highlights: Highlight[]) => void
  ) {
    if (!userId || !bookId) {
      callback([]);
      return () => {};
    }
    try {
      const q = query(
        collection(db, 'highlights'),
        where('userId', '==', userId),
        where('bookId', '==', bookId)
      );
      return onSnapshot(q, (snapshot) => {
        const highlights: Highlight[] = [];
        snapshot.forEach((d) => {
          highlights.push({ id: d.id, ...d.data() } as Highlight);
        });
        callback(highlights);
      }, () => {
        callback([]);
      });
    } catch {
      callback([]);
      return () => {};
    }
  }

  static async addHighlight(data: Omit<Highlight, 'id' | 'createdAt'>): Promise<Highlight> {
    const id = 'hl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const highlight: Highlight = {
      ...data,
      id,
      createdAt: Date.now()
    };
    await setDoc(doc(db, 'highlights', id), highlight);
    return highlight;
  }

  static async deleteHighlight(id: string): Promise<void> {
    await deleteDoc(doc(db, 'highlights', id));
  }

  /**
   * Sticky Notes
   */
  static subscribeToStickyNotes(
    userId: string, 
    bookId: string, 
    callback: (notes: StickyNote[]) => void
  ) {
    if (!userId || !bookId) {
      callback([]);
      return () => {};
    }
    try {
      const q = query(
        collection(db, 'stickyNotes'),
        where('userId', '==', userId),
        where('bookId', '==', bookId)
      );
      return onSnapshot(q, (snapshot) => {
        const notes: StickyNote[] = [];
        snapshot.forEach((d) => {
          notes.push({ id: d.id, ...d.data() } as StickyNote);
        });
        callback(notes);
      }, () => {
        callback([]);
      });
    } catch {
      callback([]);
      return () => {};
    }
  }

  static async addStickyNote(data: Omit<StickyNote, 'id' | 'createdAt'>): Promise<StickyNote> {
    const id = 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const note: StickyNote = {
      ...data,
      id,
      createdAt: Date.now()
    };
    await setDoc(doc(db, 'stickyNotes', id), note);
    return note;
  }

  static async updateStickyNote(id: string, text: string): Promise<void> {
    await updateDoc(doc(db, 'stickyNotes', id), { text });
  }

  static async deleteStickyNote(id: string): Promise<void> {
    await deleteDoc(doc(db, 'stickyNotes', id));
  }
}
