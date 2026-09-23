import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed standalone PWA, don't show
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition active:scale-95 ${className}`}
        title="Install as Progressive Web App on your device"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition active:scale-95 ${className}`}
          title="Install on iOS Home Screen"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-xl bg-zinc-900 border border-zinc-700 p-5 shadow-2xl text-white">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-black px-1.5 py-0.5 font-bold font-mono text-xs rounded">hT</span>
                  <h3 className="text-sm font-bold">Install hUGETracker on iOS</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-zinc-300">
                <div className="flex items-start gap-2.5 bg-zinc-800/80 p-3 rounded-lg">
                  <span className="bg-blue-600 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <span>
                    Tap the <b>Share</b> button in the Safari bottom toolbar (<span className="text-blue-400">square with arrow pointing up</span>).
                  </span>
                </div>

                <div className="flex items-start gap-2.5 bg-zinc-800/80 p-3 rounded-lg">
                  <span className="bg-blue-600 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <span>
                    Scroll down and tap <b>Add to Home Screen</b>.
                  </span>
                </div>

                <div className="flex items-start gap-2.5 bg-zinc-800/80 p-3 rounded-lg">
                  <span className="bg-blue-600 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <span>
                    Launch hUGETracker from your home screen for full-screen Game Boy music making without browser toolbars!
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-zinc-800 hover:bg-zinc-700 py-2 text-xs font-bold text-white transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
