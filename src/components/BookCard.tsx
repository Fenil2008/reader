import React, { useState } from 'react';
import { 
  BookOpen, 
  Globe, 
  Lock, 
  Share2, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  Check, 
  Sparkles,
  User
} from 'lucide-react';
import { Book } from '../types';
import { useAuth } from '../context/AuthContext';
import { LibraryService } from '../services/libraryService';

interface BookCardProps {
  book: Book;
  onOpen: (book: Book) => void;
  onStartSync: (book: Book) => void;
  onEdit?: (book: Book) => void;
  onDelete?: (book: Book) => void;
  progressPercent?: number;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onOpen,
  onStartSync,
  onEdit,
  onDelete,
  progressPercent
}) => {
  const { user, isAdmin } = useAuth();
  const [isPublic, setIsPublic] = useState<boolean>(book.isPublic);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);

  const isOwner = user && (user.uid === book.ownerId || isAdmin);

  const handleToggleVisibility = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner || isUpdatingVisibility) return;
    setIsUpdatingVisibility(true);
    const next = !isPublic;
    try {
      await LibraryService.toggleBookVisibility(book.id, next);
      setIsPublic(next);
    } catch {
      // Revert if error
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  return (
    <div 
      className="group relative flex flex-col liquid-glass-card rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/80 cursor-pointer"
      onClick={() => onOpen(book)}
    >
      {/* Book Cover Container with Apple Books 3D styling */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
        <img
          src={book.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'}
          alt={book.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* 3D Spine and page edge subtle shadow overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/10 pointer-events-none" />
        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-black/50 via-white/10 to-transparent pointer-events-none" />

        {/* Format Badge (EPUB in Indigo / PDF in Crimson) */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span 
            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-md ${
              book.fileType === 'epub' 
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600' 
                : 'bg-gradient-to-r from-rose-500 to-red-600'
            }`}
          >
            {book.fileType.toUpperCase()}
          </span>

          {/* Visibility Badge */}
          <span 
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 backdrop-blur-md shadow-sm ${
              isPublic 
                ? 'bg-emerald-500/80 text-white' 
                : 'bg-neutral-900/75 text-neutral-200'
            }`}
          >
            {isPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
            <span>{isPublic ? 'Public' : 'Private'}</span>
          </span>
        </div>

        {/* More Options Menu (Top Right) */}
        {isOwner && (
          <div className="absolute top-2.5 right-2.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md flex items-center justify-center transition-colors shadow-md"
              title="Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 w-40 liquid-glass rounded-xl shadow-2xl py-1 z-30 animate-in fade-in zoom-in-95 duration-150 text-xs">
                {onEdit && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(book);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Info</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(book);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-red-500/10 text-red-600 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Book</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Progress Bar overlay at bottom of cover */}
        {progressPercent !== undefined && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40 backdrop-blur-xs">
            <div 
              className="h-full bg-blue-500 rounded-r-full transition-all" 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        )}
      </div>

      {/* Book Metadata & Controls */}
      <div className="p-3.5 flex flex-col justify-between flex-1 gap-2 bg-white/40">
        <div>
          <h4 className="font-extrabold text-sm leading-snug line-clamp-1 text-[#1D1D1F] group-hover:text-blue-600 transition-colors">
            {book.title}
          </h4>
          <p className="text-xs font-medium text-neutral-600 line-clamp-1 mt-0.5">
            {book.author}
          </p>
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-black/10 flex items-center justify-between gap-1">
          {/* Read Button */}
          <button
            onClick={() => onOpen(book)}
            className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Read</span>
          </button>

          {/* Co-Reading PIN button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartSync(book);
            }}
            className="p-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-medium active:scale-95 transition-all"
            title="Start PIN Live Co-Reading Session"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* Visibility Switch (Owner Only) */}
          {isOwner && (
            <button
              onClick={handleToggleVisibility}
              disabled={isUpdatingVisibility}
              className={`p-1.5 rounded-xl text-xs font-medium transition-all ${
                isPublic 
                  ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' 
                  : 'bg-neutral-200/60 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-300/60'
              }`}
              title={isPublic ? 'Public Book (Visible in Search). Click to make Private' : 'Private Book (Only visible to you). Click to make Public'}
            >
              {isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
