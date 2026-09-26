import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  BookOpen, 
  Image as ImageIcon, 
  AlertCircle, 
  Lock, 
  Globe, 
  FileCheck
} from 'lucide-react';
import { BookFormat } from '../types';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { LibraryService } from '../services/libraryService';
import { extractPdfCover, generateTypographicCover } from '../utils/coverExtractor';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const [bookFile, setBookFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<BookFormat>('epub');
  const [title, setTitle] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState<boolean>(false);

  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension !== 'epub' && extension !== 'pdf') {
      setError('Please select a valid .epub or .pdf file.');
      return;
    }

    setBookFile(file);
    const format = extension as BookFormat;
    setFileType(format);
    setError(null);

    // Auto-fill title from filename
    let autoTitle = title;
    if (!autoTitle.trim()) {
      autoTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(autoTitle);
    }

    // Generate real cover based on file type if user hasn't uploaded a custom cover
    if (!coverFile) {
      if (format === 'pdf') {
        const extracted = await extractPdfCover(file);
        if (extracted) {
          setCoverUrl(extracted);
        } else {
          setCoverUrl(generateTypographicCover(autoTitle, author));
        }
      } else {
        setCoverUrl(generateTypographicCover(autoTitle, author));
      }
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setCoverFile(file);
    setCoverUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!bookFile) {
      setError('Please select an EPUB or PDF file.');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title for the book.');
      return;
    }

    setUploading(true);
    setUploadProgress(20);

    try {
      const bookId = 'book_' + Date.now();
      const currentUid = user?.uid || auth.currentUser?.uid || localStorage.getItem('lumina_client_id') || ('reader_' + Date.now());
      const currentEmail = user?.email || auth.currentUser?.email || 'reader@lumina.io';

      // 1. Cover URL
      let finalCoverUrl = coverUrl;
      if (coverFile) {
        try {
          finalCoverUrl = await LibraryService.uploadFileToStorage(
            `books/${bookId}/cover_${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
            coverFile
          );
        } catch {
          finalCoverUrl = coverUrl;
        }
      } else if (!finalCoverUrl) {
        finalCoverUrl = generateTypographicCover(title, author);
      }
      setUploadProgress(45);

      // 2. Upload Book File to Firebase Storage / Local Store
      const uploadedFileUrl = await LibraryService.uploadFileToStorage(
        `books/${bookId}/${bookFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
        bookFile,
        (progress) => {
          setUploadProgress(45 + Math.round(progress * 0.45));
        }
      );

      setUploadProgress(90);

      // 3. Save Book record directly in Firestore
      await LibraryService.addBook({
        title: title.trim(),
        author: author.trim() || 'Unknown Author',
        description: description.trim(),
        coverUrl: finalCoverUrl,
        fileUrl: uploadedFileUrl,
        fileType,
        fileSize: bookFile.size,
        ownerId: currentUid,
        ownerEmail: currentEmail,
        isPublic,
        pageCount: fileType === 'pdf' ? 24 : 120,
      }, bookId);

      setUploadProgress(100);
      setTimeout(() => {
        setUploading(false);
        onSuccess();
        onClose();
      }, 350);

    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err?.message || 'Failed to upload book. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-neutral-200 text-[#1D1D1F] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/10">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#1D1D1F]">Upload E-Book</h2>
            <p className="text-xs text-neutral-500">Add an EPUB or PDF with your custom book cover</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 text-[#1D1D1F] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload Box */}
          <div>
            <label className="text-xs font-bold text-[#1D1D1F] block mb-1.5">
              Select Book File (.epub or .pdf) *
            </label>
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".epub,.pdf,application/epub+zip,application/pdf"
              onChange={handleFileChange}
              className="hidden" 
            />

            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                bookFile 
                  ? 'border-blue-500 bg-blue-50/50' 
                  : 'border-black/15 hover:border-blue-400 hover:bg-black/[0.02]'
              }`}
            >
              {bookFile ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-bold text-[#1D1D1F] truncate">{bookFile.name}</p>
                    <p className="text-[11px] text-neutral-500">
                      {(bookFile.size / (1024 * 1024)).toFixed(2)} MB • {fileType.toUpperCase()} format ready
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-black/5 flex items-center justify-center mx-auto text-neutral-600">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1D1D1F]">
                      Click to choose or drag & drop file
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      EPUB (Reflowable) or PDF (Paginated)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Book Title & Author */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#1D1D1F] block mb-1">
                Book Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!coverFile) {
                    setCoverUrl(generateTypographicCover(e.target.value, author));
                  }
                }}
                placeholder="e.g. The Great Gatsby"
                className="w-full text-xs p-2.5 rounded-xl border border-black/15 bg-white text-[#1D1D1F] focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#1D1D1F] block mb-1">
                Author
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => {
                  setAuthor(e.target.value);
                  if (!coverFile) {
                    setCoverUrl(generateTypographicCover(title, e.target.value));
                  }
                }}
                placeholder="e.g. F. Scott Fitzgerald"
                className="w-full text-xs p-2.5 rounded-xl border border-black/15 bg-white text-[#1D1D1F] focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Book Cover Upload (User uploads their own real cover) */}
          <div>
            <label className="text-xs font-bold text-[#1D1D1F] block mb-1.5">
              Book Cover
            </label>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/[0.02] border border-black/10">
              {coverUrl ? (
                <img 
                  src={coverUrl} 
                  alt="Cover Preview" 
                  className="w-14 h-20 object-cover rounded-lg shadow-md border border-black/15 shrink-0" 
                />
              ) : (
                <div className="w-14 h-20 rounded-lg bg-neutral-100 border border-dashed border-neutral-300 flex items-center justify-center shrink-0 text-neutral-400">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1">
                <input 
                  type="file" 
                  ref={coverInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverChange}
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-white border border-black/15 hover:bg-neutral-50 text-[#1D1D1F] transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>{coverFile ? 'Change Cover Image' : 'Upload Cover Image'}</span>
                </button>
                <p className="text-[11px] text-neutral-500 mt-1.5">
                  {coverFile 
                    ? `Selected: ${coverFile.name}` 
                    : 'Auto-extracted from your document or upload custom JPEG/PNG'}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-[#1D1D1F] block mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary or reading notes..."
              className="w-full text-xs p-2.5 rounded-xl border border-black/15 bg-white text-[#1D1D1F] focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Privacy Visibility Switch */}
          <div className="p-3.5 rounded-2xl bg-black/[0.03] border border-black/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {isPublic ? (
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-[#1D1D1F]">
                  {isPublic ? 'Public Book' : 'Private Book (Default)'}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {isPublic 
                    ? 'Discoverable in Home search and available to readers' 
                    : 'Visible only to you in your personal shelf'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isPublic ? 'bg-emerald-500' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isPublic ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Progress Bar while uploading */}
          {uploading && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] font-bold text-neutral-600">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/10 overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={uploading}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  <span>Save to Library</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
