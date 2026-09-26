import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  Globe, 
  Lock, 
  Search, 
  FileText, 
  Users, 
  Radio, 
  X,
  Save,
  Check,
  AlertCircle
} from 'lucide-react';
import { Book } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { LibraryService } from '../../services/libraryService';

interface AdminConsoleProps {
  onOpenUpload: () => void;
  onOpenBook: (book: Book) => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ onOpenUpload, onOpenBook }) => {
  const { user, isAdmin, toggleAdminRole } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBookForEdit, setSelectedBookForEdit] = useState<Book | null>(null);
  const [deleteConfirmBook, setDeleteConfirmBook] = useState<Book | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Edit modal form state
  const [editTitle, setEditTitle] = useState<string>('');
  const [editAuthor, setEditAuthor] = useState<string>('');
  const [editCoverUrl, setEditCoverUrl] = useState<string>('');
  const [editIsPublic, setEditIsPublic] = useState<boolean>(false);

  // Subscribe to all books across the system
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = LibraryService.subscribeToAllBooks((allBooks) => {
      setBooks(allBooks);
    });
    return () => unsub();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl text-center border border-neutral-200 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold mb-1.5 text-[#1D1D1F]">Administrator Portal</h2>
        <p className="text-xs text-neutral-600 mb-6 leading-relaxed">
          Manage system-wide e-books, cloud files, and user permissions across Lumina.
        </p>
        <div className="space-y-3">
          <button
            onClick={toggleAdminRole}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Enable Administrator Permissions</span>
          </button>
        </div>
      </div>
    );
  }

  // Filter books by search query
  const filteredBooks = books.filter((b) => {
    const q = searchQuery.toLowerCase();
    return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.id.toLowerCase().includes(q);
  });

  const handleStartEdit = (b: Book) => {
    setSelectedBookForEdit(b);
    setEditTitle(b.title);
    setEditAuthor(b.author);
    setEditCoverUrl(b.coverUrl);
    setEditIsPublic(b.isPublic);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookForEdit) return;
    setIsSavingEdit(true);
    try {
      await LibraryService.updateBook(selectedBookForEdit.id, {
        title: editTitle.trim(),
        author: editAuthor.trim(),
        coverUrl: editCoverUrl.trim(),
        isPublic: editIsPublic
      });
      setSelectedBookForEdit(null);
    } catch (err) {
      console.error('Failed to update book:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!deleteConfirmBook) return;
    setIsDeleting(true);
    try {
      await LibraryService.deleteBook(deleteConfirmBook);
      setDeleteConfirmBook(null);
    } catch (err) {
      console.error('Failed to delete book:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const publicCount = books.filter(b => b.isPublic).length;
  const privateCount = books.length - publicCount;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="liquid-glass rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl border border-white/80 text-[#1D1D1F]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#1D1D1F]">Admin Console</h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                Full Authorization
              </span>
            </div>
            <p className="text-xs text-neutral-600 mt-0.5">
              Manage system repository, view all private & public books, and maintain content
            </p>
          </div>
        </div>

        <button
          onClick={onOpenUpload}
          className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload New E-Book</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="liquid-glass-card rounded-2xl p-4 border border-white/80 text-[#1D1D1F]">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Total E-Books</span>
          <span className="text-2xl font-black font-mono text-[#1D1D1F]">{books.length}</span>
        </div>
        <div className="liquid-glass-card rounded-2xl p-4 border border-white/80">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Public Books</span>
          <span className="text-2xl font-black font-mono text-emerald-700">{publicCount}</span>
        </div>
        <div className="liquid-glass-card rounded-2xl p-4 border border-white/80 text-[#1D1D1F]">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Private Books</span>
          <span className="text-2xl font-black font-mono text-neutral-700">{privateCount}</span>
        </div>
        <div className="liquid-glass-card rounded-2xl p-4 border border-white/80 text-[#1D1D1F]">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Formats Active</span>
          <span className="text-sm font-extrabold mt-1 block text-[#1D1D1F]">EPUB & PDF (Dual)</span>
        </div>
      </div>

      {/* Table Filter & Search */}
      <div className="liquid-glass rounded-2xl p-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-neutral-400 ml-2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter system books by title, author, or ID..."
          className="w-full text-xs bg-transparent focus:outline-none placeholder:text-neutral-400"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="p-1 text-neutral-400 hover:text-neutral-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Books Table */}
      <div className="liquid-glass-card rounded-3xl overflow-hidden shadow-xl border border-white/30 dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/5 dark:bg-white/5 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Book</th>
                <th className="py-3 px-4 font-semibold">Format</th>
                <th className="py-3 px-4 font-semibold">Visibility</th>
                <th className="py-3 px-4 font-semibold">Owner</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
              {filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-500">
                    No books match your criteria.
                  </td>
                </tr>
              ) : (
                filteredBooks.map((b) => (
                  <tr key={b.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={b.coverUrl} 
                          alt={b.title} 
                          className="w-9 h-12 object-cover rounded-md shadow-sm border border-neutral-200 dark:border-neutral-700" 
                        />
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-neutral-100 hover:text-blue-600 cursor-pointer" onClick={() => onOpenBook(b)}>
                            {b.title}
                          </p>
                          <p className="text-[11px] text-neutral-500">{b.author}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        b.fileType === 'epub' 
                          ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        {b.fileType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        b.isPublic 
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-neutral-200/60 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}>
                        {b.isPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                        <span>{b.isPublic ? 'Public' : 'Private'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-500 truncate max-w-[140px]">
                      {b.ownerEmail || b.ownerId}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenBook(b)}
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-medium text-xs transition-colors"
                          title="Open reader"
                        >
                          Read
                        </button>
                        <button
                          onClick={() => handleStartEdit(b)}
                          className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-blue-600 transition-colors"
                          title="Edit Metadata"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmBook(b)}
                          className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 transition-colors"
                          title="Delete from System"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Book Modal */}
      {selectedBookForEdit && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedBookForEdit(null)}
        >
          <div 
            className="w-full max-w-md liquid-glass-card rounded-3xl p-6 shadow-2xl border border-white/30 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="font-bold text-base">Edit Book Metadata</h3>
              <button onClick={() => setSelectedBookForEdit(null)} className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Author</label>
                <input
                  type="text"
                  required
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Cover Image URL</label>
                <input
                  type="url"
                  value={editCoverUrl}
                  onChange={(e) => setEditCoverUrl(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-black/5 dark:bg-white/5">
                <span className="text-xs font-medium">Public in Discover</span>
                <input
                  type="checkbox"
                  checked={editIsPublic}
                  onChange={(e) => setEditIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBookForEdit(null)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-all"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmBook && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setDeleteConfirmBook(null)}
        >
          <div 
            className="w-full max-w-sm liquid-glass-card rounded-3xl p-6 shadow-2xl border border-white/30 dark:border-white/10 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base mb-1">Delete Book</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Are you sure you want to permanently remove "<span className="font-medium text-neutral-800 dark:text-neutral-200">{deleteConfirmBook.title}</span>"? This removes both the storage file and Firestore metadata.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmBook(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBook}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
