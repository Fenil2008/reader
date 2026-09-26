import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Compass, 
  Library, 
  Plus, 
  Sparkles, 
  Search, 
  Filter, 
  Radio, 
  ShieldCheck, 
  FolderPlus, 
  Layers,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Lock,
  Globe,
  Eye,
  Volume2,
  FileText,
  Share2,
  BookMarked
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Book, BookFormat, SyncSession } from './types';
import { LibraryService } from './services/libraryService';
import { SyncService } from './services/syncService';
import { GLOBAL_FREE_BOOKS, GlobalBook } from './data/globalFreeBooks';
import { Navbar } from './components/Navbar';
import { BookCard } from './components/BookCard';
import { ReaderContainer } from './components/reader/ReaderContainer';
import { UploadModal } from './components/UploadModal';
import { SyncSessionModal } from './components/sync/SyncSessionModal';
import { AuthModal } from './components/AuthModal';
import { AdminConsole } from './components/admin/AdminConsole';
import { Footer } from './components/Footer';

function MainApp() {
  const { user, isAdmin } = useAuth();

  // Navigation & View State
  const [currentTab, setCurrentTab] = useState<'library' | 'global' | 'discover' | 'admin'>('library');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [formatFilter, setFormatFilter] = useState<'all' | 'epub' | 'pdf'>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  // Active Reader & Sync State
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [activeSyncSession, setActiveSyncSession] = useState<SyncSession | null>(null);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authDefaultAdmin, setAuthDefaultAdmin] = useState<boolean>(false);

  // Book collections (real user-uploaded books from Firestore)
  const [publicBooks, setPublicBooks] = useState<Book[]>([]);
  const [userBooks, setUserBooks] = useState<Book[]>([]);

  // Subscribe to public books in real-time
  useEffect(() => {
    const unsub = LibraryService.subscribeToPublicBooks((books) => {
      setPublicBooks(books);
    });
    return () => unsub();
  }, []);

  // Subscribe to user's personal books (both private and user's public)
  useEffect(() => {
    if (!user) {
      setUserBooks([]);
      return;
    }
    const unsub = LibraryService.subscribeToUserBooks(user.uid, (books) => {
      setUserBooks(books);
    });
    return () => unsub();
  }, [user]);

  // Subscribe to active sync session if PIN is active
  useEffect(() => {
    if (!activeSyncSession) return;
    const unsub = SyncService.subscribeToSession(activeSyncSession.pin, (session) => {
      if (!session || session.status === 'ended') {
        setActiveSyncSession(null);
      } else {
        setActiveSyncSession(session);
      }
    });
    return () => unsub();
  }, [activeSyncSession?.pin]);

  // Handle opening a book for reading
  const handleOpenBook = (book: Book) => {
    setReadingBook(book);
  };

  // Handle starting a live PIN sync session for a book
  const handleStartSyncForBook = (book: Book) => {
    setReadingBook(book);
    setIsSyncModalOpen(true);
  };

  // Handle joining a sync session by PIN
  const handleSessionJoined = async (session: SyncSession) => {
    setActiveSyncSession(session);
    // Find book to open
    const targetBook = await LibraryService.getBookById(session.bookId);
    if (targetBook) {
      setReadingBook(targetBook);
    } else {
      // Check global books
      const globalBook = GLOBAL_FREE_BOOKS.find(b => b.id === session.bookId);
      if (globalBook) setReadingBook(globalBook);
    }
  };

  // Disconnect sync session
  const handleDisconnectSync = async () => {
    if (activeSyncSession) {
      await SyncService.endSession(activeSyncSession.pin);
      setActiveSyncSession(null);
    }
  };

  // Filter books based on search & format
  const filterList = (list: Book[]) => {
    return list.filter((b) => {
      const matchesSearch = 
        !searchQuery || 
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFormat = formatFilter === 'all' || b.fileType === formatFilter;

      return matchesSearch && matchesFormat;
    });
  };

  // Filter global free books by search, format, and genre
  const filteredGlobalBooks = GLOBAL_FREE_BOOKS.filter((b) => {
    const matchesSearch = 
      !searchQuery || 
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.country && b.country.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFormat = formatFilter === 'all' || b.fileType === formatFilter;
    const matchesGenre = selectedGenre === 'all' || b.genre === selectedGenre;

    return matchesSearch && matchesFormat && matchesGenre;
  });

  const filteredPublicBooks = filterList(publicBooks);
  const filteredUserBooks = filterList(userBooks);
  const allAvailableBooks = [...userBooks, ...publicBooks, ...GLOBAL_FREE_BOOKS];

  const genres = ['all', 'Philosophy & Strategy', 'Classic Literature', 'Gothic Sci-Fi', 'Mystery & Detective', 'Sci-Fi & Adventure', 'Design & Tech'];

  // Add global book to user library
  const handleAddGlobalBookToLibrary = async (globalBook: GlobalBook) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    await LibraryService.addBook({
      title: globalBook.title,
      author: globalBook.author,
      description: globalBook.description,
      coverUrl: globalBook.coverUrl,
      fileUrl: globalBook.fileUrl,
      fileType: globalBook.fileType,
      ownerId: user.uid,
      ownerEmail: user.email || 'reader@lumina.io',
      isPublic: false,
      pageCount: globalBook.pageCount,
    });
    setCurrentTab('library');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6FA] text-[#1D1D1F] relative overflow-x-hidden selection:bg-blue-500/20 font-sans">
      {/* Apple Ambient Soft Fluid Blobs for Glass Depth */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-200/35 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 w-[32rem] h-[32rem] rounded-full bg-sky-100/50 blur-3xl" />
      </div>

      {/* Navigation Bar */}
      <Navbar
        currentTab={currentTab as any}
        onTabChange={(t) => setCurrentTab(t as any)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenAuth={() => {
          setAuthDefaultAdmin(false);
          setIsAuthOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-10">
        {/* If Admin tab is active */}
        {currentTab === 'admin' ? (
          <AdminConsole 
            onOpenUpload={() => setIsUploadOpen(true)} 
            onOpenBook={handleOpenBook} 
          />
        ) : (
          <>
            {/* HERO SPOTLIGHT BANNER (Apple Books inspired) */}
            <section className="relative rounded-3xl overflow-hidden liquid-glass p-6 sm:p-10 border border-white/80 shadow-xl">
              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 text-blue-700 text-xs font-bold border border-blue-600/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apple iOS Liquid Glass E-Book Reader</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#1D1D1F] leading-tight">
                  Read Without Limits. <br />
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                    Dual EPUB & PDF Engine.
                  </span>
                </h1>

                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-xl">
                  Reflowable chapters, authentic paper-fold audio, live cross-device sync via 6-digit PIN, warm eye protection, and your private cloud library backed by Firebase.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload E-Book</span>
                  </button>

                  <button
                    onClick={() => setCurrentTab('global')}
                    className="px-5 py-2.5 rounded-2xl bg-white hover:bg-neutral-50 text-[#1D1D1F] text-xs font-bold shadow-sm border border-black/10 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span>Free Global E-Books ({GLOBAL_FREE_BOOKS.length})</span>
                  </button>

                  <button
                    onClick={() => setIsSyncModalOpen(true)}
                    className="px-4 py-2.5 rounded-2xl bg-black/[0.04] hover:bg-black/10 text-[#1D1D1F] text-xs font-bold border border-black/5 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Radio className="w-4 h-4 text-indigo-600" />
                    <span>Live Co-Read PIN</span>
                  </button>
                </div>
              </div>

              {/* Decorative Subtle Apple Graphic Elements */}
              <div className="hidden lg:block absolute -right-4 -bottom-6 w-96 h-80 opacity-90 pointer-events-none">
                <div className="relative w-full h-full">
                  <div className="absolute right-12 top-4 w-48 h-64 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 shadow-2xl rotate-6 transform transition-transform hover:rotate-3 border-2 border-white/60 p-4 text-white flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">EPUB Engine</span>
                    <div>
                      <p className="font-extrabold text-sm leading-snug">Reflowable Typography</p>
                      <p className="text-[10px] opacity-75 mt-0.5">True Chapter Navigation</p>
                    </div>
                  </div>
                  <div className="absolute right-36 top-16 w-44 h-60 rounded-2xl bg-white shadow-2xl -rotate-6 transform border border-black/10 p-4 text-[#1D1D1F] flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-rose-600">PDF Engine</span>
                    <div>
                      <p className="font-extrabold text-sm leading-snug">Canvas Rendering</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">Page by Page Vector</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Active Live Sync Session Notification Banner */}
            {activeSyncSession && (
              <div className="liquid-glass rounded-2xl p-4 flex items-center justify-between shadow-lg border border-blue-500/30 bg-blue-50/70">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1D1D1F]">
                      Live Co-Reading Session Active • PIN: {activeSyncSession.pin}
                    </p>
                    <p className="text-[11px] text-neutral-600">
                      {activeSyncSession.hostUserId === user?.uid 
                        ? 'Host Device • Your page turns automatically synchronize to connected devices' 
                        : 'Guest Device • Connected and following the host live in real-time'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (readingBook) handleOpenBook(readingBook);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    Open Reader
                  </button>
                  <button
                    onClick={handleDisconnectSync}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-black/10 text-xs font-bold transition-all cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            )}

            {/* MAIN NAVIGATION SEGMENTS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/10">
              {/* Segment buttons */}
              <div className="flex items-center gap-2 p-1 rounded-2xl liquid-glass text-xs font-bold border border-white/80">
                <button
                  onClick={() => setCurrentTab('library')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    currentTab === 'library'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-neutral-600 hover:text-[#1D1D1F]'
                  }`}
                >
                  <Library className="w-4 h-4" />
                  <span>My Library ({filteredUserBooks.length})</span>
                </button>

                <button
                  onClick={() => setCurrentTab('global')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    currentTab === 'global'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-neutral-600 hover:text-[#1D1D1F]'
                  }`}
                >
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>Free World E-Books ({filteredGlobalBooks.length})</span>
                </button>

                <button
                  onClick={() => setCurrentTab('discover')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    currentTab === 'discover'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-neutral-600 hover:text-[#1D1D1F]'
                  }`}
                >
                  <Compass className="w-4 h-4 text-indigo-600" />
                  <span>Community Public ({filteredPublicBooks.length})</span>
                </button>
              </div>

              {/* Format Filter (All / EPUB / PDF) */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl liquid-glass text-xs font-bold border border-white/80">
                <button
                  onClick={() => setFormatFilter('all')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    formatFilter === 'all' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-neutral-500 hover:text-[#1D1D1F]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFormatFilter('epub')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    formatFilter === 'epub' 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-neutral-500 hover:text-[#1D1D1F]'
                  }`}
                >
                  EPUB
                </button>
                <button
                  onClick={() => setFormatFilter('pdf')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    formatFilter === 'pdf' 
                      ? 'bg-rose-600 text-white shadow-sm' 
                      : 'text-neutral-500 hover:text-[#1D1D1F]'
                  }`}
                >
                  PDF
                </button>
              </div>
            </div>

            {/* TAB 1: MY LIBRARY */}
            {currentTab === 'library' && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-[#1D1D1F]">
                      Personal Reading Shelf
                    </h2>
                    <p className="text-xs text-neutral-600">
                      Books uploaded here default to Private (visible only to you). Toggle any book to Public anytime.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload E-Book</span>
                  </button>
                </div>

                {filteredUserBooks.length === 0 ? (
                  <div className="liquid-glass-card rounded-3xl p-12 text-center max-w-lg mx-auto my-6 space-y-4 border border-white/80">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
                      <FolderPlus className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-[#1D1D1F]">Your Personal Library is Ready</h3>
                      <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                        You have not uploaded any personal books yet. Upload your own EPUB or PDF files, or explore free books from around the world below.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        onClick={() => setIsUploadOpen(true)}
                        className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Upload Personal E-Book</span>
                      </button>
                      <button
                        onClick={() => setCurrentTab('global')}
                        className="px-4 py-2.5 rounded-2xl bg-white hover:bg-neutral-50 text-[#1D1D1F] border border-black/10 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                      >
                        Browse Global Books
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                    {filteredUserBooks.map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        onOpen={handleOpenBook}
                        onStartSync={handleStartSyncForBook}
                        onDelete={async (b) => {
                          if (window.confirm(`Delete "${b.title}"?`)) {
                            await LibraryService.deleteBook(b);
                          }
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* TAB 2: GLOBAL FREE E-BOOKS FROM ALL OVER THE WORLD */}
            {currentTab === 'global' && (
              <section className="space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-lg font-extrabold tracking-tight text-[#1D1D1F]">
                      Free Global Literature & Masterpieces
                    </h2>
                  </div>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    Classic open-access books from authors worldwide. Reflowable EPUB format, free to read, highlight, annotate, and sync.
                  </p>
                </div>

                {/* Genre chips */}
                <div className="flex flex-wrap items-center gap-2">
                  {genres.map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGenre(g)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedGenre === g
                          ? 'bg-[#1D1D1F] text-white shadow-sm'
                          : 'bg-white hover:bg-neutral-100 text-neutral-600 border border-black/10'
                      }`}
                    >
                      {g === 'all' ? 'All Genres' : g}
                    </button>
                  ))}
                </div>

                {/* Global Books Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredGlobalBooks.map((book) => (
                    <div
                      key={book.id}
                      className="liquid-glass-card rounded-2xl p-4 flex gap-4 hover:shadow-xl transition-all duration-300 border border-white/80"
                    >
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-20 h-28 object-cover rounded-xl shadow-md shrink-0 border border-black/10"
                      />
                      <div className="flex flex-col justify-between flex-1 min-w-0">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-700">
                              {book.fileType.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-semibold truncate">
                              {book.country} • {book.year}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-sm text-[#1D1D1F] truncate leading-tight">
                            {book.title}
                          </h4>
                          <p className="text-xs font-medium text-neutral-600 truncate mt-0.5">
                            {book.author}
                          </p>
                          <p className="text-[11px] text-neutral-500 line-clamp-2 mt-1 leading-snug">
                            {book.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-2 mt-2 border-t border-black/10">
                          <button
                            onClick={() => handleOpenBook(book)}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Read Free</span>
                          </button>

                          <button
                            onClick={() => handleAddGlobalBookToLibrary(book)}
                            className="p-1.5 rounded-xl bg-white hover:bg-neutral-100 text-[#1D1D1F] border border-black/10 text-xs font-bold transition-all cursor-pointer"
                            title="Add reference to My Library"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleStartSyncForBook(book)}
                            className="p-1.5 rounded-xl bg-white hover:bg-neutral-100 text-blue-600 border border-black/10 text-xs font-bold transition-all cursor-pointer"
                            title="Start Co-Reading PIN Session"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* TAB 3: COMMUNITY DISCOVERIES */}
            {currentTab === 'discover' && (
              <section className="space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Compass className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-extrabold tracking-tight text-[#1D1D1F]">
                      Community Discoveries
                    </h2>
                  </div>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    Public books shared by readers across the platform. Discover and read immediately.
                  </p>
                </div>

                {filteredPublicBooks.length === 0 ? (
                  <div className="liquid-glass-card rounded-3xl p-12 text-center max-w-md mx-auto my-6 border border-white/80">
                    <BookOpen className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
                    <p className="font-bold text-sm text-[#1D1D1F]">No community public books found</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {searchQuery 
                        ? `No results match "${searchQuery}".` 
                        : 'Upload an e-book and toggle it to Public to share it here!'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                    {filteredPublicBooks.map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        onOpen={handleOpenBook}
                        onStartSync={handleStartSyncForBook}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* APPLE READER ARCHITECTURAL FEATURES (Enriching website content) */}
            <section className="pt-6 space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <h2 className="text-2xl font-black tracking-tight text-[#1D1D1F]">
                  Engineered with Apple iOS Fidelity
                </h2>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Every interaction is tuned for natural reading rhythm, responsive Liquid Glass ergonomics, and seamless cross-device collaboration.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="liquid-glass-card rounded-2xl p-5 border border-white/80 space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-sm text-[#1D1D1F]">Dual Format Engine</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    epub.js reflows chapters and pagination dynamically, while PDF.js paints page-based vector canvases with identical reading controls.
                  </p>
                </div>

                <div className="liquid-glass-card rounded-2xl p-5 border border-white/80 space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                    <Radio className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-sm text-[#1D1D1F]">6-Digit PIN Live Sync</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Host on your iPad or laptop and share the 6-digit code. Any connected reader automatically flips pages alongside you in real time.
                  </p>
                </div>

                <div className="liquid-glass-card rounded-2xl p-5 border border-white/80 space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <Eye className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-sm text-[#1D1D1F]">Eye Comfort & Audio</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Instant warm-amber blue light attenuation mode paired with procedural Web Audio paper curl sound effects for tactile satisfaction.
                  </p>
                </div>

                <div className="liquid-glass-card rounded-2xl p-5 border border-white/80 space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    <Bookmark className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-sm text-[#1D1D1F]">Cloud Annotations</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Color-coded text highlights and anchored page sticky notes persist in Firestore per user and reload accurately across sessions.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* FOOTER */}
      <Footer />

      {/* ======================================================== */}
      {/* FULLSCREEN READER OVERLAY */}
      {/* ======================================================== */}
      {readingBook && (
        <ReaderContainer
          book={readingBook}
          onClose={() => setReadingBook(null)}
          syncSession={activeSyncSession}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          onDisconnectSync={handleDisconnectSync}
        />
      )}

      {/* Upload Book Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          setCurrentTab('library');
        }}
      />

      {/* Cross-Device Sync PIN Modal */}
      <SyncSessionModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        activeBook={readingBook}
        availableBooks={allAvailableBooks}
        currentSession={activeSyncSession}
        onSessionJoined={handleSessionJoined}
        onSessionEnded={() => setActiveSyncSession(null)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultAdmin={authDefaultAdmin}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
