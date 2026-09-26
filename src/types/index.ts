export type BookFormat = 'epub' | 'pdf';

export type UserRole = 'admin' | 'user';

export interface UserSettings {
  theme: 'light' | 'dark' | 'sepia' | 'system';
  fontSize: number; // in pixels (e.g. 16, 18, 20)
  fontFamily: string; // 'Plus Jakarta Sans', 'Newsreader', 'Georgia', 'JetBrains Mono', 'System'
  eyeProtection: boolean;
  soundEnabled: boolean;
  brightness: number; // 50 to 100
  pageTurnStyle: 'curl' | 'slide' | 'fade';
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  settings?: Partial<UserSettings>;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  coverUrl: string;
  fileUrl: string;
  fileType: BookFormat;
  fileSize?: number;
  ownerId: string;
  ownerEmail?: string;
  isPublic: boolean;
  pageCount?: number;
  createdAt: number;
  updatedAt: number;
}

export type HighlightColor = 'yellow' | 'green' | 'coral' | 'blue' | 'purple';

export interface Highlight {
  id: string;
  userId: string;
  bookId: string;
  pageNumber: number;
  cfiRange?: string; // For EPUB
  text: string;
  color: HighlightColor;
  createdAt: number;
}

export interface StickyNote {
  id: string;
  userId: string;
  bookId: string;
  pageNumber: number;
  xPercent: number; // 0 - 100
  yPercent: number; // 0 - 100
  text: string;
  color?: string;
  createdAt: number;
}

export interface ReadingProgress {
  userId: string;
  bookId: string;
  currentPage: number;
  totalPages: number;
  percentage: number;
  epubCfi?: string;
  lastReadAt: number;
}

export interface SyncSession {
  pin: string;
  hostUserId: string;
  hostEmail?: string;
  bookId: string;
  currentPage: number;
  totalPages: number;
  epubCfi?: string;
  status: 'waiting' | 'active' | 'ended';
  createdAt: number;
  expiresAt: number;
  lastUpdated: number;
}

export interface TableOfContentsItem {
  id: string | number;
  label: string;
  href?: string;
  pageNumber?: number;
  subitems?: TableOfContentsItem[];
}
