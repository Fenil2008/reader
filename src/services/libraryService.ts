import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../firebase';
import { Book, BookFormat, ReadingProgress } from '../types';
import { SAMPLE_BOOKS } from '../data/sampleBooks';

import { LocalBookStore } from './localBookStore';

export class LibraryService {
  private static booksCollection = collection(db, 'books');
  private static progressCollection = collection(db, 'readingProgress');

  /**
   * Seed sample books into Firestore if empty - disabled as user requested no demo books
   */
  static async seedSampleBooksIfNeeded() {
    // No demo books seeded per user request
    return;
  }

  /**
   * Listen to public books in real-time
   */
  static subscribeToPublicBooks(callback: (books: Book[]) => void) {
    try {
      const q = query(
        this.booksCollection,
        where('isPublic', '==', true)
      );
      return onSnapshot(q, (snapshot) => {
        const books: Book[] = [];
        snapshot.forEach((docSnap) => {
          books.push({ id: docSnap.id, ...docSnap.data() } as Book);
        });
        callback(books);
      }, () => {
        callback([]);
      });
    } catch {
      callback([]);
      return () => {};
    }
  }

  /**
   * Listen to user's personal books (both private and user's public)
   */
  static subscribeToUserBooks(userId: string, callback: (books: Book[]) => void) {
    if (!userId) {
      callback([]);
      return () => {};
    }
    try {
      const q = query(
        this.booksCollection,
        where('ownerId', '==', userId)
      );
      return onSnapshot(q, (snapshot) => {
        const books: Book[] = [];
        snapshot.forEach((docSnap) => {
          books.push({ id: docSnap.id, ...docSnap.data() } as Book);
        });
        callback(books);
      }, () => {
        callback([]);
      });
    } catch {
      callback([]);
      return () => {};
    }
  }

  /**
   * Admin: subscribe to all books in system
   */
  static subscribeToAllBooks(callback: (books: Book[]) => void) {
    try {
      return onSnapshot(this.booksCollection, (snapshot) => {
        const books: Book[] = [];
        snapshot.forEach((docSnap) => {
          books.push({ id: docSnap.id, ...docSnap.data() } as Book);
        });
        callback(books);
      }, () => {
        callback([]);
      });
    } catch {
      callback([]);
      return () => {};
    }
  }

  /**
   * Fetch single book by ID
   */
  static async getBookById(bookId: string): Promise<Book | null> {
    try {
      const docRef = doc(db, 'books', bookId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Book;
      }
    } catch {}
    return null;
  }

  /**
   * Upload file to Firebase Storage with progress tracking,
   * with base64/blob fallback for zero-downtime reliability
   */
  static async uploadFileToStorage(
    path: string, 
    file: File | Blob, 
    onProgress?: (percent: number) => void
  ): Promise<string> {
    const fileKey = path.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // 1. Immediately save to LocalBookStore (takes ~10ms, guaranteed success)
    let localUrl = '';
    try {
      localUrl = await LocalBookStore.saveFile(fileKey, file);
      if (onProgress) onProgress(50);
    } catch (e) {
      console.warn('LocalBookStore error:', e);
    }

    // 2. Try Firebase Storage with a 4-second timeout race so it never hangs
    try {
      const fileRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(fileRef, file);

      const storagePromise = new Promise<string>((resolve) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(Math.round(progress));
          },
          (error) => {
            console.warn('Firebase Storage upload failed (rules or bucket offline):', error);
            resolve(localUrl);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadUrl);
            } catch {
              resolve(localUrl);
            }
          }
        );
      });

      const timeoutPromise = new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve(localUrl);
        }, 4000);
      });

      const resultUrl = await Promise.race([storagePromise, timeoutPromise]);
      return resultUrl || localUrl;
    } catch {
      return localUrl;
    }
  }

  /**
   * Add a new book to the library
   */
  static async addBook(bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<Book> {
    const id = customId || 'book_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const now = Date.now();
    const newBook: Book = {
      id,
      title: (bookData.title || 'Untitled Book').trim(),
      author: (bookData.author || 'Unknown Author').trim(),
      description: (bookData.description || '').trim(),
      coverUrl: bookData.coverUrl || '',
      fileUrl: bookData.fileUrl || '',
      fileType: bookData.fileType || 'epub',
      fileSize: bookData.fileSize || 0,
      ownerId: bookData.ownerId || 'guest_user',
      ownerEmail: bookData.ownerEmail || null as any,
      isPublic: Boolean(bookData.isPublic),
      pageCount: bookData.pageCount || 1,
      createdAt: now,
      updatedAt: now,
    };

    // Sanitize any undefined properties to null
    const cleanBook: any = {};
    for (const [k, v] of Object.entries(newBook)) {
      cleanBook[k] = v === undefined ? null : v;
    }

    try {
      await setDoc(doc(db, 'books', id), cleanBook);
    } catch (err) {
      console.warn('Could not write book to Firestore:', err);
    }

    // Cache locally for instant loading
    try {
      const cached = JSON.parse(localStorage.getItem('lumina_cached_books') || '[]');
      cached.unshift(cleanBook);
      localStorage.setItem('lumina_cached_books', JSON.stringify(cached.slice(0, 50)));
    } catch {}

    return cleanBook;
  }

  /**
   * Toggle book public / private status
   */
  static async toggleBookVisibility(bookId: string, isPublic: boolean): Promise<void> {
    const bookRef = doc(db, 'books', bookId);
    await updateDoc(bookRef, {
      isPublic,
      updatedAt: Date.now()
    });
  }

  /**
   * Update book metadata
   */
  static async updateBook(bookId: string, updates: Partial<Book>): Promise<void> {
    const bookRef = doc(db, 'books', bookId);
    await updateDoc(bookRef, {
      ...updates,
      updatedAt: Date.now()
    });
  }

  /**
   * Delete book from Firestore and Storage
   */
  static async deleteBook(book: Book): Promise<void> {
    try {
      await deleteDoc(doc(db, 'books', book.id));
    } catch (e) {
      console.error('Error deleting book doc:', e);
    }

    // Try deleting files from storage if stored under standard paths
    try {
      if (book.fileUrl && book.fileUrl.includes('firebasestorage')) {
        const fileRef = ref(storage, `books/${book.id}/file`);
        await deleteObject(fileRef).catch(() => {});
      }
      if (book.coverUrl && book.coverUrl.includes('firebasestorage')) {
        const coverRef = ref(storage, `books/${book.id}/cover`);
        await deleteObject(coverRef).catch(() => {});
      }
    } catch {}
  }

  /**
   * Save user reading progress
   */
  static async saveReadingProgress(progress: ReadingProgress): Promise<void> {
    try {
      const progressId = `${progress.userId}_${progress.bookId}`;
      const docRef = doc(db, 'readingProgress', progressId);
      const cleanProgress: any = {
        userId: progress.userId,
        bookId: progress.bookId,
        currentPage: progress.currentPage || 1,
        totalPages: progress.totalPages || 1,
        epubCfi: progress.epubCfi || null,
        percentage: progress.percentage || 0,
        lastReadAt: Date.now()
      };
      await setDoc(docRef, cleanProgress, { merge: true });
    } catch (e) {
      console.warn('Could not save progress to Firestore:', e);
    }
  }

  /**
   * Get user reading progress
   */
  static async getReadingProgress(userId: string, bookId: string): Promise<ReadingProgress | null> {
    try {
      const progressId = `${userId}_${bookId}`;
      const docRef = doc(db, 'readingProgress', progressId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as ReadingProgress;
      }
    } catch {}
    return null;
  }
}
