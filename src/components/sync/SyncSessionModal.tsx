import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Smartphone, 
  Radio, 
  AlertCircle,
  Users,
  BookOpen
} from 'lucide-react';
import { Book, SyncSession } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase';
import { SyncService } from '../../services/syncService';

interface SyncSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBook?: Book | null;
  availableBooks?: Book[];
  currentSession: SyncSession | null;
  onSessionJoined: (session: SyncSession) => void;
  onSessionEnded: () => void;
}

export const SyncSessionModal: React.FC<SyncSessionModalProps> = ({
  isOpen,
  onClose,
  activeBook,
  availableBooks = [],
  currentSession,
  onSessionJoined,
  onSessionEnded
}) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'host' | 'join'>('host');
  const [selectedBookId, setSelectedBookId] = useState<string>(activeBook?.id || availableBooks[0]?.id || '');
  const [pinInput, setPinInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeBook) {
      setSelectedBookId(activeBook.id);
    } else if (availableBooks.length > 0 && !selectedBookId) {
      setSelectedBookId(availableBooks[0].id);
    }
  }, [activeBook, availableBooks]);

  if (!isOpen) return null;

  const currentBookToHost = activeBook || availableBooks.find(b => b.id === selectedBookId);

  // Handle Host creating a session PIN
  const handleCreateSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const currentUid = user?.uid || auth.currentUser?.uid || ('host_' + Date.now());

      if (!currentBookToHost) {
        setError('Please upload or open a book before generating a live sync PIN.');
        setLoading(false);
        return;
      }

      const session = await SyncService.createSession(
        currentUid,
        user?.email || 'Host Reader',
        currentBookToHost.id,
        1,
        currentBookToHost.pageCount || 100
      );
      onSessionJoined(session);
    } catch (err: any) {
      console.error('Create session failed:', err);
      setError(err?.message || 'Could not initiate session PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Guest joining a session
  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const session = await SyncService.joinSession(pinInput.trim());
      if (session) {
        onSessionJoined(session);
        onClose();
      } else {
        setError('Invalid or expired 6-digit PIN. Please verify with the host.');
      }
    } catch (err: any) {
      setError('Failed to connect to session.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHost = currentSession && user && currentSession.hostUserId === user.uid;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md liquid-glass-card rounded-3xl p-6 shadow-2xl border border-white/80 text-[#1D1D1F]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-black/10">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-600 animate-pulse" />
            <h2 className="text-base font-bold tracking-tight text-[#1D1D1F]">Cross-Device Reading Sync</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 text-[#1D1D1F]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher if no active session */}
        {!currentSession && (
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/5 mb-5">
            <button
              onClick={() => { setTab('host'); setError(null); }}
              className={`py-1.5 text-xs font-semibold rounded-xl transition-all ${
                tab === 'host' ? 'bg-white shadow-sm text-blue-600' : 'text-neutral-500'
              }`}
            >
              Host Session
            </button>
            <button
              onClick={() => { setTab('join'); setError(null); }}
              className={`py-1.5 text-xs font-semibold rounded-xl transition-all ${
                tab === 'join' ? 'bg-white shadow-sm text-blue-600' : 'text-neutral-500'
              }`}
            >
              Join by PIN
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Active Session View */}
        {currentSession ? (
          <div className="space-y-4 text-center">
            <div className="p-5 rounded-2xl bg-blue-50/80 border border-blue-200/80">
              <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block mb-1">
                {isHost ? 'Active Session PIN' : 'Connected to Host Session'}
              </span>
              <div className="flex items-center justify-center gap-3 my-2">
                <span className="text-4xl font-mono font-bold tracking-widest text-[#1D1D1F]">
                  {currentSession.pin}
                </span>
                <button
                  onClick={() => handleCopyPin(currentSession.pin)}
                  className="p-2 rounded-xl bg-white shadow-sm hover:scale-105 transition-all text-[#1D1D1F] border border-black/5"
                  title="Copy PIN"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-neutral-600 mt-2">
                {isHost 
                  ? 'Share this 6-digit PIN with your iPad, iPhone, or co-reader to sync page turns in real time.'
                  : 'Your device is connected and will follow page turns automatically.'}
              </p>
            </div>

            {/* Connection Status indicator */}
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#1D1D1F]">
              <span className={`w-2.5 h-2.5 rounded-full ${
                currentSession.status === 'active' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500 animate-pulse'
              }`} />
              <span className="capitalize">
                Status: {currentSession.status === 'active' ? 'Connected & Synchronized' : 'Waiting for Device to Connect...'}
              </span>
            </div>

            {/* Disconnect button */}
            <div className="pt-2">
              <button
                onClick={async () => {
                  if (currentSession) {
                    await SyncService.endSession(currentSession.pin);
                  }
                  onSessionEnded();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
              >
                Disconnect Session
              </button>
            </div>
          </div>
        ) : tab === 'host' ? (
          /* Host Session Creation */
          <div className="space-y-4">
            {currentBookToHost ? (
              <div className="p-3.5 rounded-2xl bg-white/80 border border-black/10 flex items-center gap-3">
                <img 
                  src={currentBookToHost.coverUrl} 
                  alt={currentBookToHost.title} 
                  className="w-10 h-14 object-cover rounded-md shadow-sm border border-black/10"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#1D1D1F] truncate">{currentBookToHost.title}</p>
                  <p className="text-[11px] text-neutral-600 truncate">{currentBookToHost.author}</p>
                  <span className="inline-block mt-1 text-[10px] uppercase font-bold text-blue-600">
                    Ready to Broadcast
                  </span>
                </div>
              </div>
            ) : availableBooks.length > 0 ? (
              <div>
                <label className="text-xs font-semibold text-[#1D1D1F] block mb-1.5">
                  Select Book to Sync:
                </label>
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-black/15 bg-white text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} - {b.author}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/60 text-xs text-amber-900 space-y-1">
                <p className="font-bold">No books uploaded yet</p>
                <p className="text-neutral-600">
                  Please upload an EPUB or PDF book using "Add Book" first so you have content to broadcast to other devices.
                </p>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-white/70 border border-black/5 text-xs text-neutral-600 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#1D1D1F]">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Host-Driven Synchronization</span>
              </div>
              <p>
                When you generate a PIN, any second device entering the code will immediately mirror your page number in real time.
              </p>
            </div>

            <button
              onClick={handleCreateSession}
              disabled={loading || !currentBookToHost}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Generate 6-Digit Session PIN</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Join Session Form */
          <form onSubmit={handleJoinSession} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#1D1D1F] block mb-2 text-center">
                Enter 6-Digit Session PIN
              </label>
              <input
                type="text"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="482910"
                className="w-full text-center text-3xl font-mono font-bold tracking-widest py-3 px-4 rounded-2xl border-2 border-black/15 bg-white text-[#1D1D1F] focus:border-blue-500 focus:outline-none shadow-sm"
              />
            </div>

            <p className="text-xs text-neutral-500 text-center">
              Enter the code displayed on the host device to synchronize pages.
            </p>

            <button
              type="submit"
              disabled={loading || pinInput.length < 6}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Connect & Follow Host</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
