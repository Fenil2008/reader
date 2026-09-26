import React from 'react';
import { 
  BookOpen, 
  ShieldCheck, 
  Radio, 
  Globe, 
  Lock, 
  Check
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full mt-20 border-t border-black/10 bg-white/60 backdrop-blur-2xl text-[#1D1D1F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-black/10">
          {/* Column 1: Brand & Vision */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-[#1D1D1F]">
                Lumina Reader
              </span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              An Apple iOS-inspired personal e-book reading environment built for timeless literature, reflowable EPUB typography, native PDF precision, and instant cross-device co-reading.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-700 bg-emerald-500/10 px-2.5 py-1 rounded-full w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Firebase Cloud Sync Active</span>
            </div>
          </div>

          {/* Column 2: Core Reader Engine */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Reader Architecture
            </h4>
            <ul className="space-y-2 text-xs font-medium text-neutral-700">
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>epub.js Reflowable Engine</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>PDF.js Canvas Vector Rendering</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Interactive Page Flip Audio Effects</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Amber Warm Eye Protection Filter</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>CFI-Anchored Highlights & Notes</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Global Literature */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Free Global Literature
            </h4>
            <ul className="space-y-2 text-xs font-medium text-neutral-700">
              <li>World Classics (Austen, Shelley, Dickens)</li>
              <li>Ancient Strategy & Philosophy (Sun Tzu, Aurelius)</li>
              <li>Pioneering Sci-Fi & Adventure (Verne, Kafka)</li>
              <li>Project Gutenberg Open Formats</li>
              <li>Standard Ebooks Typography Standard</li>
            </ul>
          </div>

          {/* Column 4: Privacy & Security */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Security & Storage
            </h4>
            <ul className="space-y-2 text-xs font-medium text-neutral-700">
              <li className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Private by Default Library</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Encrypted 6-Digit PIN Sync</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Firebase Authentication & Rules</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Discoverable Public Shelf Mode</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} Lumina Reader. Crafted with Apple iOS design principles.</p>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span>Liquid Glass Interface</span>
            <span>/</span>
            <span>Reflowable EPUB & PDF</span>
            <span>/</span>
            <span>Native Typography</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
