import React, { useState } from 'react';
import { Download, Music, X, Play, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { TSong } from '../types/uge';
import { renderSongToWav } from '../lib/songRenderer';

interface RenderSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: TSong;
  isLight?: boolean;
}

export const RenderSongModal: React.FC<RenderSongModalProps> = ({
  isOpen,
  onClose,
  song,
  isLight = true,
}) => {
  const [loops, setLoops] = useState<number>(1);
  const [sampleRate, setSampleRate] = useState<number>(44100);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [result, setResult] = useState<{ url: string; blob: Blob; duration: number } | null>(null);

  if (!isOpen) return null;

  const handleStartRender = async () => {
    setIsRendering(true);
    setProgress(0);
    setStatusText('Initializing APU synthesis...');
    setResult(null);

    try {
      const renderResult = await renderSongToWav(song, {
        loopCount: loops,
        sampleRate,
        onProgress: (p, text) => {
          setProgress(p);
          setStatusText(text);
        },
      });

      setResult(renderResult);
    } catch (err) {
      setStatusText('Rendering failed. Please try again.');
    } finally {
      setIsRendering(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url;
    const cleanName = (song.name || 'GameBoy_Track').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${cleanName}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 select-none font-sans"
      onClick={() => {
        if (!isRendering) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-[480px] border shadow-2xl rounded-[3px] flex flex-col text-xs ${
          isLight ? 'bg-[#ece9d8] border-[#7f9db9] text-black' : 'bg-[#22222b] border-zinc-700 text-white'
        }`}
      >
        {/* Title Bar */}
        <div
          className={`px-2 py-1 flex items-center justify-between font-bold text-xs select-none ${
            isLight ? 'bg-[#0a246a] text-white' : 'bg-[#181822] text-zinc-100 border-b border-zinc-700'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-amber-400" />
            <span>Render Song to Audio (WAV)</span>
          </div>
          <button
            onClick={onClose}
            disabled={isRendering}
            className="w-4 h-4 bg-[#c75050] hover:bg-red-600 text-white font-bold flex items-center justify-center text-[10px] rounded-[1px] leading-none disabled:opacity-50"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-3">
          {/* Track Info Box */}
          <div
            className={`p-2.5 border rounded-[2px] flex items-center justify-between ${
              isLight ? 'bg-white border-[#abb7bc]' : 'bg-[#181820] border-zinc-700'
            }`}
          >
            <div>
              <div className="font-bold text-sm truncate max-w-[300px]">
                {song.name || 'Untitled Song'}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-zinc-400">
                by {song.artist || 'Unknown Artist'} • {song.ticksPerRow || 6} ticks/row
              </div>
            </div>
            <div className="text-right font-mono text-[11px] text-blue-600 dark:text-blue-400 font-bold">
              16-bit PCM
            </div>
          </div>

          {!result && !isRendering && (
            <div className="flex flex-col gap-3">
              <fieldset
                className={`border p-3 rounded-[2px] flex flex-col gap-3 ${
                  isLight ? 'border-[#abb7bc]' : 'border-zinc-700'
                }`}
              >
                <legend className="px-1 font-bold text-xs">Render Settings</legend>

                {/* Loops */}
                <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                  <span className="font-semibold text-xs">Song Loops:</span>
                  <select
                    value={loops}
                    onChange={(e) => setLoops(Number(e.target.value))}
                    className={`px-2 py-1 border text-xs font-semibold rounded-[2px] ${
                      isLight ? 'bg-white border-[#7f9db9]' : 'bg-zinc-800 border-zinc-700'
                    }`}
                  >
                    <option value={1}>1 Loop (Single Playthrough + End Fade)</option>
                    <option value={2}>2 Loops (Game Soundtrack Style)</option>
                    <option value={3}>3 Loops (Extended)</option>
                  </select>
                </div>

                {/* Sample Rate */}
                <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                  <span className="font-semibold text-xs">Sample Rate:</span>
                  <select
                    value={sampleRate}
                    onChange={(e) => setSampleRate(Number(e.target.value))}
                    className={`px-2 py-1 border text-xs font-semibold rounded-[2px] ${
                      isLight ? 'bg-white border-[#7f9db9]' : 'bg-zinc-800 border-zinc-700'
                    }`}
                  >
                    <option value={44100}>44,100 Hz (CD Audio Quality)</option>
                    <option value={48000}>48,000 Hz (Video / Broadcast Quality)</option>
                  </select>
                </div>
              </fieldset>

              <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-normal">
                Audio is synthesized directly from the Game Boy APU emulator at high precision, rendering all 4 channels (Pulse 1, Pulse 2, 4-bit Wavetable, and LFSR Noise) into uncompressed stereo WAV audio.
              </p>
            </div>
          )}

          {/* Rendering Progress View */}
          {isRendering && (
            <div className="flex flex-col gap-3 py-4 items-center">
              <RefreshCw className="w-7 h-7 text-blue-600 dark:text-blue-400 animate-spin" />
              <div className="text-center">
                <div className="font-bold text-xs mb-1">Synthesizing Audio...</div>
                <div className="text-[11px] text-gray-600 dark:text-gray-400 font-mono">
                  {statusText}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-4 bg-gray-200 dark:bg-zinc-800 border border-gray-400 dark:border-zinc-700 rounded-[2px] overflow-hidden p-0.5">
                <div
                  className="h-full bg-blue-600 dark:bg-blue-500 rounded-[1px] transition-all duration-150"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Render Result Preview */}
          {result && (
            <div className="flex flex-col gap-3 py-1">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Audio Render Complete!</span>
              </div>

              {/* In-browser Player */}
              <audio controls src={result.url} className="w-full mt-1" />

              <div
                className={`p-2 border rounded-[2px] grid grid-cols-2 gap-2 text-[11px] font-mono ${
                  isLight ? 'bg-white border-[#abb7bc]' : 'bg-zinc-800/80 border-zinc-700'
                }`}
              >
                <div>
                  <span className="text-gray-500">Duration: </span>
                  <span className="font-bold">{formatDuration(result.duration)}</span>
                </div>
                <div>
                  <span className="text-gray-500">File Size: </span>
                  <span className="font-bold">{formatFileSize(result.blob.size)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Channels: </span>
                  <span className="font-bold">2 (Stereo)</span>
                </div>
                <div>
                  <span className="text-gray-500">Encoding: </span>
                  <span className="font-bold">16-bit PCM WAV</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div
          className={`p-2.5 border-t flex justify-end gap-2 ${
            isLight ? 'bg-[#ece9d8] border-[#abb7bc]' : 'bg-[#1a1a22] border-zinc-700'
          }`}
        >
          {result ? (
            <>
              <button
                onClick={() => setResult(null)}
                className="px-3 py-1 bevel-button text-xs font-semibold text-black hover:bg-white"
              >
                Render Again
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-1 bevel-button bg-blue-700 text-white font-bold text-xs hover:bg-blue-600 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .wav</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isRendering}
                className="px-4 py-1 bevel-button text-xs font-semibold text-black hover:bg-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStartRender}
                disabled={isRendering}
                className="flex items-center gap-1.5 px-5 py-1 bevel-button bg-[#0055ea] text-white font-bold text-xs hover:bg-blue-600 disabled:opacity-50 shadow-sm"
              >
                <Music className="w-3.5 h-3.5" />
                <span>Start Render</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
