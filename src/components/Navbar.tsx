import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Radio, 
  ShieldCheck, 
  User, 
  LogIn, 
  LogOut, 
  Library, 
  Compass, 
  X,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentTab: 'discover' | 'library' | 'admin';
  onTabChange: (tab: 'discover' | 'library' | 'admin') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenUpload: () => void;
  onOpenSyncModal: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  onOpenUpload,
  onOpenSyncModal,
  onOpenAuth
}) => {
  const { user, isAdmin, logout, toggleAdminRole } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

  return (
    <header className="sticky top-0 z-40 w-full px-4 sm:px-6 py-3 transition-all">
      <div className="max-w-7xl mx-auto liquid-glass rounded-2xl sm:rounded-3xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg border border-white/80">
        {/* Brand / Logo */}
        <div 
          onClick={() => onTabChange('discover')}
          className="flex items-center gap-2.5 cursor-pointer shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="hidden min-[420px]:block">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#1D1D1F]">
              Lumina
            </span>
            <span className="text-[10px] block font-semibold text-neutral-500 -mt-1 tracking-wide">
              Reader
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-sm mx-1 sm:mx-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search books..."
              className="w-full text-xs pl-9 pr-8 py-2 rounded-2xl bg-black/[0.04] border border-black/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-[#1D1D1F] font-medium placeholder:text-neutral-500"
            />
            {searchQuery && (
              <button 
                onClick={() => onSearchChange('')} 
                className="absolute right-2.5 text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs (Apple Segmented Control) */}
        <div className="hidden md:flex items-center p-1 rounded-2xl bg-black/[0.05] border border-black/5">
          <button
            onClick={() => onTabChange('discover')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentTab === 'discover'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-neutral-600 hover:text-[#1D1D1F]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Discover</span>
          </button>

          <button
            onClick={() => onTabChange('library')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentTab === 'library'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-neutral-600 hover:text-[#1D1D1F]'
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            <span>My Library</span>
          </button>

          <button
            onClick={() => onTabChange('admin')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentTab === 'admin'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-neutral-600 hover:text-[#1D1D1F]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span>Admin</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Join / Co-Read PIN button */}
          <button
            onClick={onOpenSyncModal}
            className="p-2 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl bg-black/[0.05] hover:bg-black/10 text-xs font-bold text-[#1D1D1F] flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-black/5"
            title="Co-Reading PIN Sync"
          >
            <Radio className="w-4 h-4 text-blue-600" />
            <span className="hidden lg:inline">Co-Read</span>
          </button>

          {/* Add Book Button */}
          <button
            onClick={onOpenUpload}
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
            title="Upload EPUB or PDF"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Book</span>
          </button>

          {/* User Profile / Menu */}
          {user && user.email ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl sm:rounded-2xl hover:bg-black/5 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
                <span className="text-xs font-bold text-[#1D1D1F] hidden md:inline truncate max-w-[100px]">
                  {user.displayName || 'Reader'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowProfileMenu(false)} 
                  />
                  <div 
                    className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs border border-neutral-200 text-[#1D1D1F]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-2.5 border-b border-black/10">
                      <p className="font-bold text-[#1D1D1F] truncate">{user.displayName || 'Reader'}</p>
                      <p className="text-[11px] text-neutral-500 truncate">{user.email || 'Signed in'}</p>
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-700">
                        {user.role}
                      </span>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onOpenAuth();
                        }}
                        className="w-full px-3 py-2 text-left rounded-xl hover:bg-black/5 flex items-center gap-2 text-[#1D1D1F] font-medium cursor-pointer"
                      >
                        <User className="w-4 h-4 text-blue-600" />
                        <span>Switch Account / Sign In</span>
                      </button>

                      <button
                        onClick={() => {
                          toggleAdminRole();
                        }}
                        className="w-full px-3 py-2 text-left rounded-xl hover:bg-black/5 flex items-center justify-between text-[#1D1D1F] cursor-pointer"
                      >
                        <span className="font-medium">Account Role</span>
                        <span className="font-bold text-blue-600">{isAdmin ? 'Admin' : 'User'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onTabChange('admin');
                        }}
                        className="w-full px-3 py-2 text-left rounded-xl hover:bg-black/5 flex items-center gap-2 text-amber-700 font-bold cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-amber-500" />
                        <span>Admin Console</span>
                      </button>
                    </div>

                    <div className="pt-1 border-t border-black/10">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          logout();
                        }}
                        className="w-full px-3 py-2 text-left rounded-xl hover:bg-red-50 text-red-600 flex items-center gap-2 font-semibold cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-2 rounded-xl sm:rounded-2xl bg-[#1D1D1F] text-white text-xs font-bold active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Segmented Bar */}
      <div className="md:hidden flex items-center justify-around max-w-xs mx-auto mt-2 p-1 rounded-2xl liquid-glass text-xs font-bold shadow-md">
        <button
          onClick={() => onTabChange('discover')}
          className={`flex-1 py-1 text-center rounded-xl transition-all cursor-pointer ${
            currentTab === 'discover' ? 'bg-white text-blue-600 shadow-sm' : 'text-neutral-500'
          }`}
        >
          Discover
        </button>
        <button
          onClick={() => onTabChange('library')}
          className={`flex-1 py-1 text-center rounded-xl transition-all cursor-pointer ${
            currentTab === 'library' ? 'bg-white text-blue-600 shadow-sm' : 'text-neutral-500'
          }`}
        >
          My Library
        </button>
        <button
          onClick={() => onTabChange('admin')}
          className={`flex-1 py-1 text-center rounded-xl transition-all cursor-pointer ${
            currentTab === 'admin' ? 'bg-white text-blue-600 shadow-sm' : 'text-neutral-500'
          }`}
        >
          Admin
        </button>
      </div>
    </header>
  );
};
