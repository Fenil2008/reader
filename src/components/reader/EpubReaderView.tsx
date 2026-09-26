import React, { useEffect, useRef, useState, useCallback } from 'react';
import ePub from 'epubjs';
import { FileText, X } from 'lucide-react';
import { Highlight, HighlightColor, StickyNote, TableOfContentsItem } from '../../types';

interface EpubReaderViewProps {
  fileUrl: string;
  initialCfi?: string;
  onPageChange: (newPage: number, cfi?: string) => void;
  onTotalPages: (total: number) => void;
  onTocLoaded: (toc: TableOfContentsItem[]) => void;
  highlights: Highlight[];
  onAddHighlight: (highlight: Omit<Highlight, 'id' | 'createdAt'>) => void;
  stickyNotes: StickyNote[];
  onAddStickyNote: (note: Omit<StickyNote, 'id' | 'createdAt'>) => void;
  onDeleteStickyNote: (id: string) => void;
  isPlacingNote: boolean;
  onNotePlaced: () => void;
  fontSize: number;
  fontFamily: string;
  theme: string;
  brightness: number;
  isTwoPage?: boolean;
  zoomLevel?: number;
  pageTurnAnim?: 'none' | 'forward' | 'backward';
}

export const EpubReaderView: React.FC<EpubReaderViewProps> = ({
  fileUrl,
  initialCfi,
  onPageChange,
  onTotalPages,
  onTocLoaded,
  highlights,
  onAddHighlight,
  stickyNotes,
  onAddStickyNote,
  onDeleteStickyNote,
  isPlacingNote,
  onNotePlaced,
  fontSize,
  fontFamily,
  theme,
  brightness,
  isTwoPage = false,
  zoomLevel = 1.0,
  pageTurnAnim = 'none'
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<any>(null);
  const renditionRef = useRef<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const [selectedText, setSelectedText] = useState<{ text: string; cfiRange: string; x: number; y: number } | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [newNoteInput, setNewNoteInput] = useState<{ xPercent: number; yPercent: number; text: string } | null>(null);

  const effectiveFontSize = Math.round(fontSize * zoomLevel);

  // Initialize and load EPUB
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    if (!containerRef.current) return;

    try {
      if (renditionRef.current) {
        try {
          renditionRef.current.destroy();
        } catch {}
      }
      if (bookRef.current) {
        try {
          bookRef.current.destroy();
        } catch {}
      }

      containerRef.current.innerHTML = '';

      const book = ePub(fileUrl, {
        openAs: 'epub'
      });
      bookRef.current = book;

      const rendition = book.renderTo(containerRef.current, {
        width: '100%',
        height: '100%',
        flow: 'paginated',
        spread: isTwoPage ? 'always' : 'none'
      });
      renditionRef.current = rendition;

      // Register themes
      rendition.themes.register('light', {
        body: { background: '#FAF8F5', color: '#1C1C1E', padding: '0 20px !important' }
      });
      rendition.themes.register('dark', {
        body: { background: '#121212', color: '#E4E4E7', padding: '0 20px !important' }
      });
      rendition.themes.register('sepia', {
        body: { background: '#F8F1E5', color: '#5B4636', padding: '0 20px !important' }
      });

      // Apply initial theme & font size factoring in zoom
      const currentTheme = theme === 'dark' ? 'dark' : theme === 'sepia' ? 'sepia' : 'light';
      rendition.themes.select(currentTheme);
      rendition.themes.fontSize(`${effectiveFontSize}px`);
      if (fontFamily && fontFamily !== 'System') {
        rendition.themes.font(fontFamily);
      }

      // Display book
      rendition.display(initialCfi || undefined).then(() => {
        if (!isMounted) return;
        setLoading(false);

        // Generate locations for page numbers
        book.locations.generate(1024).then(() => {
          if (!isMounted) return;
          const total = book.locations.total || 100;
          onTotalPages(total);
        }).catch(() => {
          onTotalPages(85);
        });
      }).catch((err: any) => {
        console.warn('Rendition display error:', err);
        if (isMounted) {
          setError('Could not load EPUB file formatting. A text reader preview will be presented.');
          setLoading(false);
        }
      });

      // Extract Table of Contents
      book.loaded.navigation.then((nav: any) => {
        if (!isMounted || !nav?.toc) return;
        const formattedToc: TableOfContentsItem[] = nav.toc.map((item: any) => ({
          id: item.id || item.href,
          label: item.label?.trim() || 'Chapter',
          href: item.href
        }));
        onTocLoaded(formattedToc);
      }).catch(() => {});

      // Relocated listener
      rendition.on('relocated', (location: any) => {
        if (!isMounted) return;
        const cfi = location.start.cfi;
        if (book.locations.length()) {
          const page = book.locations.locationFromCfi(cfi) + 1;
          setCurrentPageNum(page);
          onPageChange(page, cfi);
        } else {
          onPageChange(currentPageNum, cfi);
        }
      });

      // Handle text selection inside iframe
      rendition.on('selected', (cfiRange: string, contents: any) => {
        const selection = contents.window.getSelection();
        if (selection && selection.toString().trim()) {
          const text = selection.toString().trim();
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
          setSelectedText({
            text,
            cfiRange,
            x: containerRect.left + rect.left + rect.width / 2,
            y: containerRect.top + rect.top - 10
          });
        }
      });

    } catch (e: any) {
      console.error('EPUB init failure:', e);
      if (isMounted) {
        setError('Failed to initialize EPUB engine. Check file validity.');
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
      if (renditionRef.current) {
        try {
          renditionRef.current.destroy();
        } catch {}
      }
    };
  }, [fileUrl, isTwoPage]);

  // Update theme & font settings dynamically
  useEffect(() => {
    if (!renditionRef.current) return;
    const currentTheme = theme === 'dark' ? 'dark' : theme === 'sepia' ? 'sepia' : 'light';
    try {
      renditionRef.current.themes.select(currentTheme);
      renditionRef.current.themes.fontSize(`${effectiveFontSize}px`);
      renditionRef.current.themes.override('font-size', `${effectiveFontSize}px`, true);
      if (fontFamily && fontFamily !== 'System') {
        renditionRef.current.themes.font(fontFamily);
      }
    } catch (e) {
      console.warn('Font scale update warning:', e);
    }
  }, [theme, effectiveFontSize, fontFamily]);

  // Render highlights on DOM
  useEffect(() => {
    if (!renditionRef.current) return;
    highlights.forEach((hl) => {
      if (hl.cfiRange) {
        try {
          const colorHex = hl.color === 'yellow' ? '#fde047' : hl.color === 'green' ? '#4ade80' : hl.color === 'blue' ? '#38bdf8' : '#fb7185';
          renditionRef.current.annotations.add('highlight', hl.cfiRange, {}, undefined, 'hl-class', {
            fill: colorHex,
            'fill-opacity': '0.35',
            'mix-blend-mode': 'multiply'
          });
        } catch {}
      }
    });
  }, [highlights]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacingNote || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.max(2, Math.min(90, (clickX / rect.width) * 100));
    const yPercent = Math.max(2, Math.min(90, (clickY / rect.height) * 100));

    setNewNoteInput({ xPercent, yPercent, text: '' });
    onNotePlaced();
  };

  const applyHighlight = (color: HighlightColor) => {
    if (!selectedText) return;
    onAddHighlight({
      bookId: '',
      userId: '',
      pageNumber: currentPageNum,
      cfiRange: selectedText.cfiRange,
      text: selectedText.text,
      color
    });
    setSelectedText(null);
  };

  const currentPageNotes = stickyNotes.filter(n => n.pageNumber === currentPageNum);

  return (
    <div 
      className="relative w-full h-[80vh] flex flex-col items-center justify-center overflow-auto"
      style={{ filter: `brightness(${brightness}%)` }}
    >
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 z-10 bg-inherit">
          <div className="w-10 h-10 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium tracking-tight">Rendering EPUB typography...</p>
        </div>
      )}

      {error ? (
        <div className="liquid-glass-card rounded-2xl p-8 max-w-lg text-center my-auto">
          <p className="font-semibold text-neutral-800 dark:text-neutral-200 mb-2">Reflowable Content Notice</p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">{error}</p>
        </div>
      ) : (
        <div className="relative p-2 rounded-2xl bg-[#1c1d21] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-neutral-800">
          <div
            ref={containerRef}
            onClick={handleContainerClick}
            className={`w-full max-w-5xl h-[76vh] rounded-xl p-4 md:p-8 overflow-hidden relative transition-colors duration-300 book-paper-texture ${
              theme === 'dark' ? 'bg-[#121212] text-neutral-100' : theme === 'sepia' ? 'bg-[#F8F1E5] text-[#5B4636]' : 'bg-[#FAF8F5] text-neutral-900'
            } ${isPlacingNote ? 'cursor-crosshair ring-2 ring-blue-500' : ''} ${
              pageTurnAnim === 'forward' ? 'anim-single-page-next' : pageTurnAnim === 'backward' ? 'anim-single-page-prev' : ''
            }`}
          />
        </div>
      )}

      {/* Sticky Notes on Current Page */}
      {currentPageNotes.map((note) => (
        <div
          key={note.id}
          style={{ left: `${note.xPercent}%`, top: `${note.yPercent}%` }}
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
          onClick={(e) => {
            e.stopPropagation();
            setActiveNoteId(activeNoteId === note.id ? null : note.id);
          }}
        >
          <button 
            className="w-8 h-8 rounded-full bg-amber-400 text-amber-950 shadow-lg flex items-center justify-center font-bold text-xs hover:scale-110 active:scale-95 transition-transform border border-amber-300 cursor-pointer"
            title="View Sticky Note"
          >
            <FileText className="w-4 h-4 text-amber-950" />
          </button>

          {activeNoteId === note.id && (
            <div 
              className="absolute top-10 left-0 w-64 bg-amber-50 text-amber-950 rounded-xl p-3 shadow-2xl border border-amber-200 z-30 animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-200/60">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Sticky Note</span>
                <button 
                  onClick={() => onDeleteStickyNote(note.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium px-1.5 py-0.5 rounded hover:bg-red-100/50 cursor-pointer"
                >
                  Delete
                </button>
              </div>
              <p className="text-sm font-sans leading-relaxed whitespace-pre-wrap">{note.text}</p>
            </div>
          )}
        </div>
      ))}

      {/* Floating Highlight Toolbar for selected text */}
      {selectedText && (
        <div
          style={{ left: `${selectedText.x}px`, top: `${selectedText.y}px` }}
          className="fixed z-40 -translate-x-1/2 -translate-y-full mb-2 bg-white/95 rounded-2xl p-1.5 shadow-2xl border border-neutral-200 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            onClick={() => applyHighlight('yellow')}
            className="w-6 h-6 rounded-full bg-amber-300 hover:scale-110 transition-transform shadow-xs cursor-pointer"
            title="Yellow Highlight"
          />
          <button
            onClick={() => applyHighlight('green')}
            className="w-6 h-6 rounded-full bg-emerald-400 hover:scale-110 transition-transform shadow-xs cursor-pointer"
            title="Green Highlight"
          />
          <button
            onClick={() => applyHighlight('blue')}
            className="w-6 h-6 rounded-full bg-sky-400 hover:scale-110 transition-transform shadow-xs cursor-pointer"
            title="Blue Highlight"
          />
          <button
            onClick={() => applyHighlight('coral')}
            className="w-6 h-6 rounded-full bg-rose-400 hover:scale-110 transition-transform shadow-xs cursor-pointer"
            title="Coral Highlight"
          />
          <button
            onClick={() => setSelectedText(null)}
            className="p-1 text-neutral-400 hover:text-neutral-700 ml-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
