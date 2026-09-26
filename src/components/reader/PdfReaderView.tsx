import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { FileText, X } from 'lucide-react';
import { Highlight, HighlightColor, StickyNote } from '../../types';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface PdfReaderViewProps {
  fileUrl: string;
  currentPage: number;
  onPageChange: (newPage: number) => void;
  onTotalPages: (total: number) => void;
  highlights: Highlight[];
  onAddHighlight: (highlight: Omit<Highlight, 'id' | 'createdAt'>) => void;
  stickyNotes: StickyNote[];
  onAddStickyNote: (note: Omit<StickyNote, 'id' | 'createdAt'>) => void;
  onUpdateStickyNote: (id: string, text: string) => void;
  onDeleteStickyNote: (id: string) => void;
  isPlacingNote: boolean;
  onNotePlaced: () => void;
  theme: string;
  brightness: number;
  isTwoPage?: boolean;
  zoomLevel?: number;
  pageTurnAnim?: 'none' | 'forward' | 'backward';
}

export const PdfReaderView: React.FC<PdfReaderViewProps> = ({
  fileUrl,
  currentPage,
  onPageChange,
  onTotalPages,
  highlights,
  onAddHighlight,
  stickyNotes,
  onAddStickyNote,
  onUpdateStickyNote,
  onDeleteStickyNote,
  isPlacingNote,
  onNotePlaced,
  theme,
  brightness,
  isTwoPage = false,
  zoomLevel = 1.0,
  pageTurnAnim = 'none'
}) => {
  const canvasLeftRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRightRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<{ text: string; x: number; y: number } | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [newNoteInput, setNewNoteInput] = useState<{ xPercent: number; yPercent: number; text: string } | null>(null);
  
  // Track window dimensions for responsive base page fit
  const [windowDims, setWindowDims] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowDims({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load PDF document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    const loadDoc = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({
          url: fileUrl,
          withCredentials: false
        });
        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          onTotalPages(doc.numPages);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error loading PDF:', err);
        if (!isCancelled) {
          setError('Could not load PDF document. Please verify the document format.');
          setLoading(false);
        }
      }
    };

    loadDoc();
    return () => {
      isCancelled = true;
    };
  }, [fileUrl]);

  // Render a specific page to canvas with razor-sharp high-DPI scaling
  const renderSinglePage = useCallback(async (pageNum: number, canvas: HTMLCanvasElement | null) => {
    if (!pdfDoc || !canvas || pageNum < 1 || pageNum > pdfDoc.numPages) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const context = canvas.getContext('2d');
      if (!context) return;

      // Base unscaled page viewport (scale: 1.0)
      const baseViewport = page.getViewport({ scale: 1.0 });

      // Available vertical stage height (subtract header and margin)
      const availableStageHeight = Math.max(380, windowDims.height - 180);
      
      // Compute fit-to-screen scale at zoomLevel 1.0
      // In 2-page mode: each page fits ~46% of width or full stage height
      const heightScale = availableStageHeight / baseViewport.height;
      const widthConstraint = isTwoPage ? (windowDims.width * 0.44) / baseViewport.width : (windowDims.width * 0.88) / baseViewport.width;
      const fitScale = Math.min(heightScale, widthConstraint);

      // Apply zoom directly to the scale so text actually grows/shrinks!
      const computedScale = Math.max(0.35, fitScale * zoomLevel);
      const viewport = page.getViewport({ scale: computedScale });
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

      // Explicit pixel buffer dimensions with DPR
      const pixelWidth = Math.floor(viewport.width * dpr);
      const pixelHeight = Math.floor(viewport.height * dpr);

      canvas.width = pixelWidth;
      canvas.height = pixelHeight;

      // CSS display dimensions: EXACT match with scaled viewport, NO CSS max-h squashing!
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas as any
      };

      await page.render(renderContext as any).promise;
    } catch (err) {
      console.warn(`PDF render error on page ${pageNum}:`, err);
    }
  }, [pdfDoc, isTwoPage, zoomLevel, windowDims]);

  // Render left and right pages whenever page, doc, scale or duo mode updates
  useEffect(() => {
    if (!pdfDoc) return;
    renderSinglePage(currentPage, canvasLeftRef.current);
    if (isTwoPage && currentPage + 1 <= pdfDoc.numPages) {
      renderSinglePage(currentPage + 1, canvasRightRef.current);
    }
  }, [pdfDoc, currentPage, isTwoPage, zoomLevel, renderSinglePage]);

  // Handle click on page to place sticky note
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacingNote || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.max(2, Math.min(90, (clickX / rect.width) * 100));
    const yPercent = Math.max(2, Math.min(90, (clickY / rect.height) * 100));

    setNewNoteInput({ xPercent, yPercent, text: '' });
    onNotePlaced();
  };

  // Handle text selection for highlights
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString().trim();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText({
        text,
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
    } else {
      setSelectedText(null);
    }
  };

  const applyHighlight = (color: HighlightColor) => {
    if (!selectedText) return;
    onAddHighlight({
      bookId: '',
      userId: '',
      pageNumber: currentPage,
      text: selectedText.text,
      color
    });
    setSelectedText(null);
  };

  const currentPageNotes = stickyNotes.filter(n => 
    n.pageNumber === currentPage || (isTwoPage && n.pageNumber === currentPage + 1)
  );

  // Calculate realistic stacked page thickness
  const total = pdfDoc?.numPages || 100;
  const leftPagePercent = Math.min(100, Math.max(0, (currentPage / total) * 100));
  const leftThickness = Math.max(2, Math.min(10, Math.round((leftPagePercent / 100) * 8)));
  const rightThickness = Math.max(2, Math.min(10, 10 - leftThickness));

  return (
    <div 
      className="relative w-full h-full flex overflow-auto select-text p-2 sm:p-6"
      style={{ filter: `brightness(${brightness}%)` }}
      onMouseUp={handleMouseUp}
    >
      {loading && (
        <div className="m-auto flex flex-col items-center justify-center p-12 text-neutral-500">
          <div className="w-10 h-10 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium tracking-tight">Rendering vector pages...</p>
        </div>
      )}

      {error ? (
        <div className="m-auto p-8 text-center bg-red-50 text-red-600 rounded-2xl max-w-md border border-red-200">
          <p className="font-semibold text-sm mb-1">Rendering Notice</p>
          <p className="text-xs text-red-500">{error}</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          onClick={handlePageClick}
          className={`m-auto relative flex items-center justify-center transition-transform shrink-0 ${
            isPlacingNote ? 'cursor-crosshair ring-2 ring-blue-500' : ''
          }`}
        >
          {isTwoPage ? (
            /* Apple Books Duo Two-Page Spread with Seamless Flush Center Binding */
            <div className="relative p-1.5 sm:p-2.5 rounded-2xl bg-[#1d1f24] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_2px_rgba(0,0,0,0.8)] border border-neutral-800 shrink-0">
              <div className="flex items-stretch rounded-xl overflow-hidden shadow-2xl bg-[#faf8f5]">
                {/* Left Page Leaf - Flush against spine on the right */}
                <div 
                  style={{ borderLeftWidth: `${leftThickness}px`, borderLeftColor: '#e2e8f0' }}
                  className={`relative book-paper-texture flex flex-col items-end p-2 sm:p-3 shadow-inner transition-transform duration-300 shrink-0 ${
                    pageTurnAnim === 'backward' ? 'anim-flip-backward' : ''
                  }`}
                >
                  <div className="relative flex flex-col items-center">
                    <canvas ref={canvasLeftRef} className="block shadow-xs rounded-xs" />
                    <div className="w-full flex items-center justify-between text-[11px] text-neutral-400 font-serif italic mt-1.5 px-1">
                      <span>{currentPage}</span>
                      <span className="text-[10px] tracking-widest uppercase not-italic font-sans text-neutral-400">Left Page</span>
                    </div>
                  </div>
                  {/* Subtle inner gutter shadow near spine */}
                  <div className="absolute right-0 top-0 bottom-0 w-6 pointer-events-none bg-gradient-to-l from-black/15 to-transparent" />
                </div>

                {/* Ultra-Realistic 3D Book Spine Center Gutter */}
                <div className="w-5 sm:w-6 shrink-0 relative book-spine-gutter flex items-center justify-center">
                  <div className="w-[1px] h-[98%] bg-white/20 shadow-xs" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30 pointer-events-none" />
                </div>

                {/* Right Page Leaf - Flush against spine on the left */}
                <div 
                  style={{ borderRightWidth: `${rightThickness}px`, borderRightColor: '#e2e8f0' }}
                  className={`relative book-paper-texture flex flex-col items-start p-2 sm:p-3 shadow-inner transition-transform duration-300 shrink-0 ${
                    pageTurnAnim === 'forward' ? 'anim-flip-forward' : ''
                  }`}
                >
                  {/* Subtle inner gutter shadow near spine */}
                  <div className="absolute left-0 top-0 bottom-0 w-6 pointer-events-none bg-gradient-to-r from-black/15 to-transparent" />

                  {pdfDoc && currentPage + 1 <= pdfDoc.numPages ? (
                    <div className="relative flex flex-col items-center">
                      <canvas ref={canvasRightRef} className="block shadow-xs rounded-xs" />
                      <div className="w-full flex items-center justify-between text-[11px] text-neutral-400 font-serif italic mt-1.5 px-1">
                        <span className="text-[10px] tracking-widest uppercase not-italic font-sans text-neutral-400">Right Page</span>
                        <span>{currentPage + 1}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-64 h-[68vh] flex flex-col items-center justify-center text-neutral-400 p-8 text-center">
                      <div className="w-12 h-12 rounded-full border border-neutral-300 flex items-center justify-center mb-3">
                        <FileText className="w-5 h-5 text-neutral-400" />
                      </div>
                      <p className="text-sm font-serif italic text-neutral-500">End of Document</p>
                      <p className="text-[11px] text-neutral-400 mt-1">You have reached the final page</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Single Page View with Physical Binding Depth */
            <div 
              className={`relative p-1.5 sm:p-2.5 rounded-2xl bg-[#1c1d21] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.45)] border border-neutral-800 transition-transform shrink-0 ${
                pageTurnAnim === 'forward' 
                  ? 'anim-single-page-next' 
                  : pageTurnAnim === 'backward' 
                    ? 'anim-single-page-prev' 
                    : ''
              }`}
            >
              <div className="relative book-paper-texture p-2.5 sm:p-4 rounded-xl shadow-xl border border-black/10">
                {/* Left Spine Stitch Line */}
                <div className="absolute left-2 top-0 bottom-0 w-[1px] bg-neutral-300/60" />
                <canvas ref={canvasLeftRef} className="block shadow-xs rounded-xs" />
                <div className="w-full text-center text-[11px] text-neutral-400 font-serif italic mt-2">
                  Page {currentPage} of {pdfDoc?.numPages || total}
                </div>
              </div>
            </div>
          )}

          {/* Sticky Notes on Current Pages */}
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
                  <div className="mt-2 text-right">
                    <span className="text-[10px] text-amber-600">Page {note.pageNumber}</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* New Note Input Form */}
          {newNoteInput && (
            <div
              style={{ left: `${newNoteInput.xPercent}%`, top: `${newNoteInput.yPercent}%` }}
              className="absolute z-30 -translate-x-1/2 -translate-y-1/2 w-64 bg-amber-50 text-amber-950 rounded-xl p-3 shadow-2xl border border-amber-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[11px] font-semibold text-amber-900 mb-1">New Sticky Note</div>
              <textarea
                autoFocus
                rows={3}
                value={newNoteInput.text}
                onChange={(e) => setNewNoteInput({ ...newNoteInput, text: e.target.value })}
                placeholder="Type your note here..."
                className="w-full text-xs p-2 rounded-lg border border-amber-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  onClick={() => setNewNoteInput(null)}
                  className="px-2.5 py-1 text-xs text-neutral-600 hover:text-neutral-900 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newNoteInput.text.trim()) {
                      onAddStickyNote({
                        bookId: '',
                        userId: '',
                        pageNumber: currentPage,
                        xPercent: newNoteInput.xPercent,
                        yPercent: newNoteInput.yPercent,
                        text: newNoteInput.text.trim()
                      });
                    }
                    setNewNoteInput(null);
                  }}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
