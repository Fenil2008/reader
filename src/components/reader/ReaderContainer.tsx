import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  Settings2, 
  SunMedium, 
  Moon, 
  Eye, 
  Volume2, 
  VolumeX, 
  Share2, 
  BookOpen, 
  Bookmark, 
  StickyNote as StickyNoteIcon, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X,
  Sparkles,
  Maximize2,
  Minimize2,
  Trash2,
  Columns,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { Book, Highlight, StickyNote, TableOfContentsItem, SyncSession } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { LibraryService } from '../../services/libraryService';
import { AnnotationService } from '../../services/annotationService';
import { SyncService } from '../../services/syncService';
import { soundManager } from '../../utils/sound';
import { LocalBookStore } from '../../services/localBookStore';
import { PdfReaderView } from './PdfReaderView';
import { EpubReaderView } from './EpubReaderView';

interface ReaderContainerProps {
  book: Book;
  onClose: () => void;
  syncSession?: SyncSession | null;
  onOpenSyncModal: () => void;
  onDisconnectSync?: () => void;
}

export const ReaderContainer: React.FC<ReaderContainerProps> = ({
  book,
  onClose,
  syncSession,
  onOpenSyncModal,
  onDisconnectSync
}) => {
  const { user, updateUserSettings } = useAuth();

  // Settings state (initialized from user preferences or defaults)
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>(
    (user?.settings?.theme as any) || 'light'
  );
  const [fontSize, setFontSize] = useState<number>(user?.settings?.fontSize || 18);
  const [fontFamily, setFontFamily] = useState<string>(user?.settings?.fontFamily || 'Plus Jakarta Sans');
  const [eyeProtection, setEyeProtection] = useState<boolean>(user?.settings?.eyeProtection || false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(user?.settings?.soundEnabled ?? true);
  const [brightness, setBrightness] = useState<number>(user?.settings?.brightness || 100);

  // Pagination & Reading progress
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(book.pageCount || 100);
  const [currentCfi, setCurrentCfi] = useState<string | undefined>(undefined);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [pageTurnAnim, setPageTurnAnim] = useState<'none' | 'forward' | 'backward'>('none');
  const [resolvedFileUrl, setResolvedFileUrl] = useState<string>(book.fileUrl);
  const [isTwoPage, setIsTwoPage] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  useEffect(() => {
    let active = true;
    LocalBookStore.resolveBookUrl(book.fileUrl).then((url) => {
      if (active && url) {
        setResolvedFileUrl(url);
      }
    });
    return () => {
      active = false;
    };
  }, [book.fileUrl]);

  // UI Panels
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showToc, setShowToc] = useState<boolean>(false);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(false);
  const [isPlacingNote, setIsPlacingNote] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Data
  const [toc, setToc] = useState<TableOfContentsItem[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);

  const touchStartX = useRef<number | null>(null);

  // Load saved reading progress
  useEffect(() => {
    if (!user) return;
    LibraryService.getReadingProgress(user.uid, book.id).then((progress) => {
      if (progress && progress.currentPage) {
        setCurrentPage(progress.currentPage);
        if (progress.epubCfi) setCurrentCfi(progress.epubCfi);
      }
    });
  }, [user, book.id]);

  // Subscribe to highlights and sticky notes
  useEffect(() => {
    if (!user) return;
    const unsubHl = AnnotationService.subscribeToHighlights(user.uid, book.id, setHighlights);
    const unsubNotes = AnnotationService.subscribeToStickyNotes(user.uid, book.id, setStickyNotes);
    return () => {
      unsubHl();
      unsubNotes();
    };
  }, [user, book.id]);

  // Handle Sync Session updates (guest follows host)
  useEffect(() => {
    if (!syncSession || !user) return;
    const isHost = syncSession.hostUserId === user.uid;

    if (!isHost && syncSession.currentPage !== currentPage) {
      setCurrentPage(syncSession.currentPage);
      if (syncSession.epubCfi) {
        setCurrentCfi(syncSession.epubCfi);
      }
      if (soundEnabled) soundManager.playPageTurn();
    }
  }, [syncSession, user]);

  // Page navigation
  const goToPage = useCallback((newPage: number, cfi?: string) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;

    const direction = newPage > currentPage ? 'forward' : 'backward';
    setPageTurnAnim(direction);
    if (soundEnabled) {
      soundManager.playPageTurn(direction);
    }

    setTimeout(() => {
      setPageTurnAnim('none');
    }, 420);

    setCurrentPage(newPage);
    if (cfi) setCurrentCfi(cfi);

    // If EPUB, trigger internal turn
    if (book.fileType === 'epub') {
      if (direction === 'forward') {
        window.dispatchEvent(new CustomEvent('reader:next'));
      } else {
        window.dispatchEvent(new CustomEvent('reader:prev'));
      }
    }

    // Auto-save progress to Firestore
    if (user) {
      LibraryService.saveReadingProgress({
        userId: user.uid,
        bookId: book.id,
        currentPage: newPage,
        totalPages,
        percentage: Math.round((newPage / totalPages) * 100),
        epubCfi: cfi,
        lastReadAt: Date.now()
      });
    }

    // If hosting a live sync session, broadcast page change!
    if (syncSession && user && syncSession.hostUserId === user.uid) {
      SyncService.updatePage(syncSession.pin, newPage, cfi);
    }
  }, [currentPage, totalPages, soundEnabled, book.fileType, book.id, user, syncSession]);

  const nextPage = () => {
    const step = isTwoPage ? 2 : 1;
    goToPage(Math.min(totalPages, currentPage + step));
  };
  const prevPage = () => {
    const step = isTwoPage ? 2 : 1;
    goToPage(Math.max(1, currentPage - step));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevPage();
      } else if (e.key === 'Escape') {
        handleCloseWithAnimation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  // Swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 55) {
      if (diff > 0) nextPage();
      else prevPage();
    }
    touchStartX.current = null;
  };

  // Exit with Apple iOS page/book close scale animation
  const handleCloseWithAnimation = () => {
    if (soundEnabled) soundManager.playBookClose();
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 360);
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Add highlight
  const handleAddHighlight = async (hl: Omit<Highlight, 'id' | 'createdAt'>) => {
    if (!user) return;
    await AnnotationService.addHighlight({
      ...hl,
      userId: user.uid,
      bookId: book.id
    });
  };

  // Add sticky note
  const handleAddStickyNote = async (note: Omit<StickyNote, 'id' | 'createdAt'>) => {
    if (!user) return;
    await AnnotationService.addStickyNote({
      ...note,
      userId: user.uid,
      bookId: book.id
    });
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden select-none transition-all duration-300 ${
        theme === 'dark' ? 'bg-[#1E1E22] text-[#F5F5F7]' : theme === 'sepia' ? 'bg-[#F5EFE6] text-[#4A3B32]' : 'bg-[#F6F7FB] text-[#1D1D1F]'
      } ${eyeProtection ? 'eye-protection-active' : ''} ${isClosing ? 'animate-book-close' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ======================================================== */}
      {/* 1. TOP LIQUID GLASS TOOLBAR */}
      {/* ======================================================== */}
      <div 
        className={`fixed top-4 left-4 right-4 z-40 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6 pointer-events-none'
        }`}
      >
        <div className="max-w-5xl mx-auto liquid-glass rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-xl border border-white/80 text-[#1D1D1F]">
          {/* Left: Back / Close button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCloseWithAnimation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-black/5 active:scale-95 transition-all text-sm font-bold text-[#1D1D1F] cursor-pointer"
              title="Close Book (Esc)"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Library</span>
            </button>
            <div className="h-4 w-[1px] bg-black/15 hidden sm:block" />
            <div className="hidden md:flex flex-col">
              <span className="text-xs font-bold truncate max-w-[220px] text-[#1D1D1F]">{book.title}</span>
              <span className="text-[10px] text-neutral-600 truncate max-w-[200px]">{book.author}</span>
            </div>
          </div>

          {/* Center: Live Sync PIN Status Badge */}
          {syncSession && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>PIN: {syncSession.pin}</span>
              <span className="text-[10px] opacity-75">
                ({syncSession.hostUserId === user?.uid ? 'Host' : 'Guest'})
              </span>
              {onDisconnectSync && (
                <button 
                  onClick={onDisconnectSync}
                  className="ml-1 text-red-500 hover:text-red-700 font-bold p-0.5 rounded cursor-pointer"
                  title="Disconnect Co-Reading"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Right: Reading Tools */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Zoom In & Out Controls */}
            <div className="flex items-center bg-black/5 dark:bg-white/10 rounded-xl p-0.5">
              <button
                onClick={() => setZoomLevel(prev => Math.max(0.6, Number((prev - 0.2).toFixed(2))))}
                disabled={zoomLevel <= 0.6}
                className="p-1.5 rounded-lg hover:bg-white/80 dark:hover:bg-black/40 transition-all disabled:opacity-30 cursor-pointer text-[#1D1D1F]"
                title="Zoom Out (Decrease Size)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(1.0)}
                className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-neutral-600 hover:text-blue-600 transition-colors cursor-pointer"
                title="Click to reset to 100% Fit"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={() => setZoomLevel(prev => Math.min(2.6, Number((prev + 0.2).toFixed(2))))}
                disabled={zoomLevel >= 2.6}
                className="p-1.5 rounded-lg hover:bg-white/80 dark:hover:bg-black/40 transition-all disabled:opacity-30 cursor-pointer text-[#1D1D1F]"
                title="Zoom In (Enlarge Text)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sound Effects Toggle */}
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                soundManager.setMuted(!next);
                updateUserSettings({ soundEnabled: next });
              }}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                soundEnabled ? 'bg-blue-500/10 text-blue-600 shadow-xs' : 'text-neutral-400 hover:bg-black/5'
              }`}
              title={soundEnabled ? 'Page Turn Sound: Enabled' : 'Page Turn Sound: Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Two-Page Spread Toggle (Duo Mode) */}
            <button
              onClick={() => setIsTwoPage(!isTwoPage)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isTwoPage ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title={isTwoPage ? 'Switch to Single Page' : 'Switch to Two-Page Duo Spread (Apple Books Effect)'}
            >
              <Columns className="w-4 h-4" />
            </button>
            {/* Table of Contents */}
            <button
              onClick={() => {
                setShowToc(!showToc);
                setShowSettings(false);
                setShowAnnotations(false);
              }}
              className={`p-2 rounded-xl transition-all ${
                showToc ? 'bg-blue-500 text-white shadow-md' : 'hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title="Table of Contents"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Highlights & Notes Drawer */}
            <button
              onClick={() => {
                setShowAnnotations(!showAnnotations);
                setShowSettings(false);
                setShowToc(false);
              }}
              className={`p-2 rounded-xl transition-all relative ${
                showAnnotations ? 'bg-blue-500 text-white shadow-md' : 'hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title="Highlights & Notes"
            >
              <Bookmark className="w-4 h-4" />
              {(highlights.length > 0 || stickyNotes.length > 0) && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>

            {/* Eye Protection Mode Toggle */}
            <button
              onClick={() => {
                const next = !eyeProtection;
                setEyeProtection(next);
                updateUserSettings({ eyeProtection: next });
              }}
              className={`p-2 rounded-xl transition-all ${
                eyeProtection ? 'bg-amber-500 text-white shadow-md' : 'hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title={eyeProtection ? 'Eye Protection: On (Warm Filter)' : 'Eye Protection: Off'}
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* Live Co-Read PIN modal */}
            <button
              onClick={onOpenSyncModal}
              className={`p-2 rounded-xl transition-all ${
                syncSession ? 'bg-emerald-500 text-white shadow-md' : 'hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title="Connect Device (PIN Co-Reading)"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Settings & Appearance */}
            <button
              onClick={() => {
                setShowSettings(!showSettings);
                setShowToc(false);
                setShowAnnotations(false);
              }}
              className={`p-2 rounded-xl transition-all ${
                showSettings ? 'bg-blue-500 text-white shadow-md' : 'hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title="Display & Reader Settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all hidden sm:block cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Focus Mode (Hide Tools - Book Only) */}
            <button
              onClick={() => setShowControls(false)}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer text-neutral-500 hover:text-black"
              title="Focus Mode (Hide Tools)"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Restore Tools Pill (When Tools Are Hidden) */}
      {!showControls && (
        <button
          onClick={() => setShowControls(true)}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full liquid-glass text-xs font-bold shadow-xl text-[#1D1D1F] hover:bg-white flex items-center gap-1.5 transition-all cursor-pointer border border-white/80 animate-in fade-in zoom-in-95 duration-200"
          title="Show Tools"
        >
          <Eye className="w-3.5 h-3.5 text-blue-600" />
          <span>Show Tools</span>
        </button>
      )}

      {/* ======================================================== */}
      {/* 2. MAIN READING CANVAS / STAGE WITH 3D PAGE TURN */}
      {/* ======================================================== */}
      <div 
        className={`flex-1 w-full flex items-center justify-center relative overflow-hidden page-3d-stage ${
          isFullscreen ? 'pt-4 pb-4 px-1 sm:px-3' : 'pt-16 pb-20 px-2 sm:px-6'
        }`}
        onClick={() => {
          // Close open popovers if tapped on blank stage
          setShowSettings(false);
          setShowToc(false);
          setShowAnnotations(false);
        }}
      >
        {/* Left Tap Zone for previous page */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            prevPage();
          }}
          className="absolute left-0 top-16 bottom-20 w-16 sm:w-24 z-20 cursor-w-resize opacity-0 hover:opacity-10 transition-opacity flex items-center justify-start pl-2"
          title="Previous Page"
        >
          <ChevronLeft className="w-8 h-8 text-neutral-400" />
        </div>

        {/* Right Tap Zone for next page */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            nextPage();
          }}
          className="absolute right-0 top-16 bottom-20 w-16 sm:w-24 z-20 cursor-e-resize opacity-0 hover:opacity-10 transition-opacity flex items-center justify-end pr-2"
          title="Next Page"
        >
          <ChevronRight className="w-8 h-8 text-neutral-400" />
        </div>

        {/* Center Reader Content - Stable & Never Shakes */}
        <div 
          className={`w-full h-full flex items-center justify-center transition-all ${
            isTwoPage || isFullscreen ? 'max-w-none' : 'max-w-5xl'
          }`}
        >
          {book.fileType === 'pdf' ? (
            <PdfReaderView
              fileUrl={resolvedFileUrl}
              currentPage={currentPage}
              onPageChange={(p) => goToPage(p)}
              onTotalPages={(tot) => setTotalPages(tot)}
              highlights={highlights}
              onAddHighlight={handleAddHighlight}
              stickyNotes={stickyNotes}
              onAddStickyNote={handleAddStickyNote}
              onUpdateStickyNote={(id, text) => AnnotationService.updateStickyNote(id, text)}
              onDeleteStickyNote={(id) => AnnotationService.deleteStickyNote(id)}
              isPlacingNote={isPlacingNote}
              onNotePlaced={() => setIsPlacingNote(false)}
              theme={theme}
              brightness={brightness}
              isTwoPage={isTwoPage}
              zoomLevel={zoomLevel}
              pageTurnAnim={pageTurnAnim}
            />
          ) : (
            <EpubReaderView
              fileUrl={resolvedFileUrl}
              initialCfi={currentCfi}
              onPageChange={(p, cfi) => goToPage(p, cfi)}
              onTotalPages={(tot) => setTotalPages(tot)}
              onTocLoaded={(tocItems) => setToc(tocItems)}
              highlights={highlights}
              onAddHighlight={handleAddHighlight}
              stickyNotes={stickyNotes}
              onAddStickyNote={handleAddStickyNote}
              onDeleteStickyNote={(id) => AnnotationService.deleteStickyNote(id)}
              isPlacingNote={isPlacingNote}
              onNotePlaced={() => setIsPlacingNote(false)}
              fontSize={fontSize}
              fontFamily={fontFamily}
              theme={theme}
              brightness={brightness}
              isTwoPage={isTwoPage}
              zoomLevel={zoomLevel}
              pageTurnAnim={pageTurnAnim}
            />
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. BOTTOM LIQUID GLASS TOOLBAR */}
      {/* ======================================================== */}
      <div 
        className={`fixed bottom-4 left-4 right-4 z-40 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        <div className="max-w-4xl mx-auto liquid-glass rounded-2xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl border border-white/80 text-[#1D1D1F]">
          {/* Left: Previous Page & Sticky Note Tool */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={prevPage}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black/[0.05] hover:bg-black/10 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all text-xs font-bold text-[#1D1D1F] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>

            {/* Sticky note drop button */}
            <button
              onClick={() => setIsPlacingNote(!isPlacingNote)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isPlacingNote 
                  ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-400' 
                  : 'bg-black/[0.05] hover:bg-black/10 text-[#1D1D1F]'
              }`}
              title="Click here, then click anywhere on the page to drop a sticky note"
            >
              <StickyNoteIcon className="w-3.5 h-3.5" />
              <span>{isPlacingNote ? 'Click on Page' : 'Drop Note'}</span>
            </button>
          </div>

          {/* Center: Persistent Page Counter & Slider */}
          <div className="flex items-center gap-3 w-full sm:flex-1 max-w-md px-2">
            <span className="text-xs font-black font-mono tracking-tight text-[#1D1D1F] whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </span>

            <input
              type="range"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => goToPage(Number(e.target.value))}
              className="w-full h-1.5 bg-black/15 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            <span className="text-[11px] font-bold text-neutral-600 whitespace-nowrap">
              {Math.round((currentPage / totalPages) * 100)}%
            </span>
          </div>

          {/* Right: Next Page Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={nextPage}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all text-xs font-bold shadow-md cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. SETTINGS & APPEARANCE SHEET (Frosted Glass Modal) */}
      {/* ======================================================== */}
      {showSettings && (
        <div 
          className="fixed top-20 right-4 sm:right-12 z-50 w-80 liquid-glass rounded-3xl p-5 shadow-2xl border border-white/30 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200 text-neutral-900 dark:text-neutral-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-sm font-bold tracking-tight">Display & Theme</h3>
            <button 
              onClick={() => setShowSettings(false)}
              className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Theme Palette Selection (Light / Dark / Sepia) */}
          <div className="mb-4">
            <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-2">Theme</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  setTheme('light');
                  updateUserSettings({ theme: 'light' });
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  theme === 'light' 
                    ? 'border-blue-500 bg-white text-neutral-900 shadow-md ring-2 ring-blue-500/20' 
                    : 'border-neutral-200 dark:border-neutral-700 bg-white/40 hover:bg-white/80 text-neutral-800'
                }`}
              >
                <SunMedium className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>

              <button
                onClick={() => {
                  setTheme('sepia');
                  updateUserSettings({ theme: 'sepia' });
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  theme === 'sepia' 
                    ? 'border-amber-600 bg-[#F4EEDF] text-[#4A3B32] shadow-md ring-2 ring-amber-500/20' 
                    : 'border-neutral-200 dark:border-neutral-700 bg-[#F4EEDF]/40 hover:bg-[#F4EEDF] text-[#4A3B32]'
                }`}
              >
                <span>Sepia</span>
              </button>

              <button
                onClick={() => {
                  setTheme('dark');
                  updateUserSettings({ theme: 'dark' });
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  theme === 'dark' 
                    ? 'border-blue-500 bg-neutral-900 text-white shadow-md ring-2 ring-blue-500/20' 
                    : 'border-neutral-200 dark:border-neutral-700 bg-neutral-800/40 hover:bg-neutral-800 text-neutral-300'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Brightness Slider */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Brightness</span>
              <span className="font-mono text-neutral-600 dark:text-neutral-400">{brightness}%</span>
            </div>
            <input
              type="range"
              min={40}
              max={100}
              value={brightness}
              onChange={(e) => {
                const b = Number(e.target.value);
                setBrightness(b);
                updateUserSettings({ brightness: b });
              }}
              className="w-full h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Font Size & Family (EPUB) */}
          {book.fileType === 'epub' && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Font Size</span>
                <span className="font-mono text-neutral-600 dark:text-neutral-400">{fontSize}px</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const s = Math.max(12, fontSize - 2);
                    setFontSize(s);
                    updateUserSettings({ fontSize: s });
                  }}
                  className="px-3 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 font-bold text-xs"
                >
                  A-
                </button>
                <input
                  type="range"
                  min={12}
                  max={32}
                  value={fontSize}
                  onChange={(e) => {
                    const s = Number(e.target.value);
                    setFontSize(s);
                    updateUserSettings({ fontSize: s });
                  }}
                  className="w-full h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <button
                  onClick={() => {
                    const s = Math.min(32, fontSize + 2);
                    setFontSize(s);
                    updateUserSettings({ fontSize: s });
                  }}
                  className="px-3 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 font-bold text-sm"
                >
                  A+
                </button>
              </div>

              {/* Font Family Selection */}
              <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mt-3 mb-1.5">Font Style</label>
              <select
                value={fontFamily}
                onChange={(e) => {
                  setFontFamily(e.target.value);
                  updateUserSettings({ fontFamily: e.target.value });
                }}
                className="w-full text-xs p-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
              >
                <option value="Plus Jakarta Sans">Sans-Serif (Plus Jakarta Sans)</option>
                <option value="Newsreader">Serif (Newsreader Classic)</option>
                <option value="Georgia">Editorial Serif (Georgia)</option>
                <option value="JetBrains Mono">Monospace (JetBrains Mono)</option>
                <option value="System">System Default</option>
              </select>
            </div>
          )}

          {/* Sound Effect Toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-500" /> : <VolumeX className="w-4 h-4 text-neutral-400" />}
              <span className="text-xs font-medium">Page-Turn Sound</span>
            </div>
            <button
              onClick={() => {
                const s = !soundEnabled;
                setSoundEnabled(s);
                updateUserSettings({ soundEnabled: s });
                if (s) soundManager.playPageTurn();
              }}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                soundEnabled ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              <span 
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. TABLE OF CONTENTS DRAWER */}
      {/* ======================================================== */}
      {showToc && (
        <div 
          className="fixed top-20 left-4 sm:left-12 z-50 w-80 max-h-[70vh] flex flex-col liquid-glass rounded-3xl p-5 shadow-2xl border border-white/30 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200 text-neutral-900 dark:text-neutral-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-sm font-bold tracking-tight">Table of Contents</h3>
            <button 
              onClick={() => setShowToc(false)}
              className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto space-y-1 pr-1 flex-1">
            {toc.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-6">No chapters or table of contents detected for this book format.</p>
            ) : (
              toc.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (item.href) {
                      window.dispatchEvent(new CustomEvent('reader:goto-href', { detail: item.href }));
                    }
                    setShowToc(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 transition-colors truncate"
                >
                  {item.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. HIGHLIGHTS & STICKY NOTES DRAWER */}
      {/* ======================================================== */}
      {showAnnotations && (
        <div 
          className="fixed top-20 right-4 sm:right-24 z-50 w-88 max-h-[75vh] flex flex-col liquid-glass rounded-3xl p-5 shadow-2xl border border-white/30 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200 text-neutral-900 dark:text-neutral-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h3 className="text-sm font-bold tracking-tight">Annotations</h3>
              <p className="text-[10px] text-neutral-500">
                {highlights.length} Highlights • {stickyNotes.length} Sticky Notes
              </p>
            </div>
            <button 
              onClick={() => setShowAnnotations(false)}
              className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto space-y-3 pr-1 flex-1">
            {/* Sticky Notes section */}
            <div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">Sticky Notes</span>
              {stickyNotes.length === 0 ? (
                <p className="text-xs text-neutral-400 italic mb-3">No sticky notes placed yet. Use the "Drop Note" tool!</p>
              ) : (
                <div className="space-y-2 mb-3">
                  {stickyNotes.map((note) => (
                    <div 
                      key={note.id} 
                      className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-950 dark:text-amber-200 flex items-start justify-between gap-2"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 block mb-0.5">Page {note.pageNumber}</span>
                        <p className="text-xs leading-relaxed">{note.text}</p>
                      </div>
                      <button 
                        onClick={() => AnnotationService.deleteStickyNote(note.id)}
                        className="text-neutral-400 hover:text-red-500 p-1"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Highlights section */}
            <div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">Highlights</span>
              {highlights.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">No text highlighted yet. Select any text to highlight it!</p>
              ) : (
                <div className="space-y-2">
                  {highlights.map((hl) => (
                    <div 
                      key={hl.id} 
                      className="p-2.5 rounded-xl bg-white/60 dark:bg-white/5 border border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            hl.color === 'yellow' ? 'bg-yellow-400' :
                            hl.color === 'green' ? 'bg-emerald-400' :
                            hl.color === 'coral' ? 'bg-rose-400' :
                            hl.color === 'blue' ? 'bg-blue-400' : 'bg-purple-400'
                          }`} />
                          <span className="text-[10px] text-neutral-500 font-mono">Page {hl.pageNumber}</span>
                        </div>
                        <p className="text-xs italic leading-relaxed text-neutral-700 dark:text-neutral-300">"{hl.text}"</p>
                      </div>
                      <button 
                        onClick={() => AnnotationService.deleteHighlight(hl.id)}
                        className="text-neutral-400 hover:text-red-500 p-1"
                        title="Delete highlight"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
