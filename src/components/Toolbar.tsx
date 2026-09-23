import React, { useRef } from 'react';
import {
  Play,
  Square,
  Volume2,
  VolumeX,
  FileDown,
  FolderOpen,
  FilePlus,
  Code2,
  AlertCircle,
  Music,
  Disc,
  Sun,
  Moon,
  Smartphone,
  Sliders,
} from 'lucide-react';
import { TSong } from '../types/uge';
import { PWAInstallButton } from './PWAInstallButton';

interface ToolbarProps {
  song: TSong;
  isPlaying: boolean;
  onPlay: (fromCursor?: boolean) => void;
  onStop: () => void;
  onPanic: () => void;
  onNewSong: () => void;
  onLoadUgeFile: (file: File) => void;
  onLoadSampleSong: (fileName: string) => void;
  onSaveUgeFile: () => void;
  onOpenGbdkExport: () => void;
  currentOctave: number;
  onOctaveChange: (octave: number) => void;
  currentInstrument: number;
  onInstrumentChange: (inst: number) => void;
  currentStep: number;
  onStepChange: (step: number) => void;
  activeChannel: number;
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
  meters: [number, number, number, number];
  onUpdateSong?: (updates: Partial<TSong>) => void;
  guiMode?: 'modern' | 'classic' | 'furnace' | 'mobile';
  onToggleGuiMode?: () => void;
  onSwitchGuiMode?: (mode: 'modern' | 'classic' | 'furnace' | 'mobile') => void;
  colorTheme?: 'dark' | 'light';
  onToggleColorTheme?: () => void;
}

const SAMPLE_SONGS = [
  { name: 'Coffee Bat - Blue Ocean.uge', label: 'Coffee Bat - Blue Ocean (V5)' },
  { name: 'FADE - Strap in and Suit Up.uge', label: 'FADE - Strap In & Suit Up (V6)' },
  { name: 'Reed - Funkabeer\'s Revenge.uge', label: 'Reed Richards - Funkabeer (V1)' },
  { name: 'Arachno - A Sad Touch.uge', label: 'Arachno - A Sad Touch (V4)' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  song,
  isPlaying,
  onPlay,
  onStop,
  onPanic,
  onNewSong,
  onLoadUgeFile,
  onLoadSampleSong,
  onSaveUgeFile,
  onOpenGbdkExport,
  currentOctave,
  onOctaveChange,
  currentInstrument,
  onInstrumentChange,
  currentStep,
  onStepChange,
  activeChannel,
  masterVolume,
  onMasterVolumeChange,
  meters,
  onUpdateSong,
  guiMode = 'modern',
  onToggleGuiMode,
  onSwitchGuiMode,
  colorTheme = 'dark',
  onToggleColorTheme,
}) => {
  const isLight = colorTheme === 'light';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tickRate = song.timerEnabled
    ? 4096 / Math.max(1, 256 - (song.timerDivider ?? 0))
    : 59.7275;
  const currentBpm = Math.round((tickRate * 60) / (4 * Math.max(1, song.ticksPerRow)));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadUgeFile(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Channel instrument label helper
  const getInstrumentLabel = (idx: number) => {
    if (idx <= 0) return '00: None';
    const num = idx;
    if (activeChannel === 0 || activeChannel === 1) {
      const name = song.dutyInstruments[num - 1]?.name || `Duty ${num}`;
      return `${num.toString().padStart(2, '0')}: ${name}`;
    } else if (activeChannel === 2) {
      const name = song.waveInstruments[num - 1]?.name || `Wave ${num}`;
      return `${num.toString().padStart(2, '0')}: ${name}`;
    } else {
      const name = song.noiseInstruments[num - 1]?.name || `Noise ${num}`;
      return `${num.toString().padStart(2, '0')}: ${name}`;
    }
  };

  return (
    <header
      className={`flex flex-wrap items-center justify-between px-3 py-2 border-b text-xs gap-2 shrink-0 ${
        isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-zinc-900 border-zinc-800 text-zinc-300'
      }`}
    >
      {/* Brand & File Operations */}
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-2 px-2 py-1 rounded border shadow-inner ${
            isLight ? 'bg-white border-slate-300' : 'bg-zinc-950 border-zinc-800'
          }`}
        >
          <Disc className="w-4 h-4 text-emerald-600 animate-spin-slow" />
          <span className="font-bold tracking-wider text-emerald-600 font-mono text-sm">
            hUGETracker
          </span>
          <span
            className={`px-1.5 py-0.5 text-[10px] rounded font-mono border ${
              isLight
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
            }`}
          >
            WEB
          </span>
        </div>

        {/* File actions */}
        <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
          <button
            onClick={onNewSong}
            title="New Song"
            className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 rounded transition text-zinc-200 border border-zinc-700"
          >
            <FilePlus className="w-3.5 h-3.5 text-zinc-400" />
            <span>New</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Open .uge file"
            className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 rounded transition text-zinc-200 border border-zinc-700"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Open .uge</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".uge"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Sample songs selector */}
          <div className="relative flex items-center">
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  onLoadSampleSong(e.target.value);
                  e.target.value = '';
                }
              }}
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 border border-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="" disabled>
                Load Demo Song...
              </option>
              {SAMPLE_SONGS.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onSaveUgeFile}
            title="Save as .uge (v6 binary format)"
            className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 rounded transition text-zinc-200 border border-zinc-700"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            <span>Save .uge</span>
          </button>

          <button
            onClick={onOpenGbdkExport}
            title="Export to GBDK C"
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-900/60 hover:bg-emerald-800 active:bg-emerald-700 text-emerald-200 rounded transition border border-emerald-600/50 shadow-sm font-medium"
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>Export GBDK C</span>
          </button>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
        <button
          onClick={() => onPlay(false)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition ${
            isPlaying
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
          }`}
          title="Play song from beginning (F5 / Enter)"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Play</span>
        </button>

        <button
          onClick={() => onPlay(true)}
          className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-200 transition"
          title="Play song from current cursor (F6)"
        >
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          <span>Cursor</span>
        </button>

        <button
          onClick={onStop}
          className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-200 transition"
          title="Stop playback (F8 / Esc)"
        >
          <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
          <span>Stop</span>
        </button>

        <button
          onClick={onPanic}
          className="flex items-center gap-1 px-2 py-1 bg-rose-950/70 hover:bg-rose-900 text-rose-300 rounded border border-rose-800 transition"
          title="Panic: silence all sound channels immediately"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Panic</span>
        </button>

        {/* Channel Activity Meters */}
        <div className="flex items-center gap-1 pl-2 border-l border-zinc-800" title="Channel Activity (CH1..CH4)">
          {meters.map((meter, ch) => {
            const height = Math.min(100, Math.max(10, Math.round(meter * 100)));
            const color =
              ch === 0
                ? 'bg-red-500'
                : ch === 1
                ? 'bg-orange-500'
                : ch === 2
                ? 'bg-yellow-400'
                : 'bg-emerald-400';
            return (
              <div
                key={ch}
                className="w-2.5 h-5 bg-zinc-800 rounded-sm overflow-hidden flex flex-col justify-end border border-zinc-700"
                title={`CH${ch + 1}`}
              >
                <div
                  className={`w-full ${color} transition-all duration-75`}
                  style={{ height: `${height}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Tracker Parameters (Octave, Instrument, Step, Master Vol) */}
      <div className="flex items-center gap-3">
        {/* Octave */}
        <div className="flex items-center gap-1">
          <span className="text-zinc-400 font-mono">Octave:</span>
          <select
            value={currentOctave}
            onChange={(e) => onOctaveChange(Number(e.target.value))}
            className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 rounded border border-zinc-700 font-mono focus:outline-none"
          >
            {[3, 4, 5, 6, 7, 8].map((oct) => (
              <option key={oct} value={oct}>
                {oct}
              </option>
            ))}
          </select>
        </div>

        {/* Instrument */}
        <div className="flex items-center gap-1">
          <span className="text-zinc-400 font-mono">Inst:</span>
          <select
            value={currentInstrument}
            onChange={(e) => onInstrumentChange(Number(e.target.value))}
            className="w-32 px-1.5 py-0.5 bg-zinc-800 text-zinc-200 rounded border border-zinc-700 font-mono focus:outline-none text-ellipsis overflow-hidden"
          >
            {Array.from({ length: 15 }, (_, i) => i + 1).map((idx) => (
              <option key={idx} value={idx}>
                {getInstrumentLabel(idx)}
              </option>
            ))}
          </select>
        </div>

        {/* Step */}
        <div className="flex items-center gap-1">
          <span className="text-zinc-400 font-mono">Step:</span>
          <select
            value={currentStep}
            onChange={(e) => onStepChange(Number(e.target.value))}
            className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 rounded border border-zinc-700 font-mono focus:outline-none"
          >
            {[0, 1, 2, 3, 4, 8, 16].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Speed / Ticks per Row & BPM */}
        <div className="flex items-center gap-1.5 pl-1.5 border-l border-zinc-800">
          <span className="text-zinc-400 font-mono" title="Ticks per row (Speed)">Ticks:</span>
          {onUpdateSong ? (
            <input
              type="number"
              min="1"
              max="32"
              value={song.ticksPerRow}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= 32) {
                  onUpdateSong({ ticksPerRow: val });
                }
              }}
              className="w-12 px-1 py-0.5 bg-zinc-800 text-amber-300 font-mono text-center rounded border border-zinc-700 focus:outline-none focus:border-amber-500"
              title="Change ticks per row"
            />
          ) : (
            <span className="text-amber-300 font-mono px-1">{song.ticksPerRow}</span>
          )}
          <span className="text-[11px] text-zinc-400 font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800/80" title="Calculated BPM">
            {currentBpm} BPM
          </span>
        </div>

        {/* Master Volume */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800">
          <button
            onClick={() => onMasterVolumeChange(masterVolume > 0 ? 0 : 0.3)}
            title={masterVolume > 0 ? 'Mute Master' : 'Unmute Master'}
            className="text-zinc-400 hover:text-zinc-200"
          >
            {masterVolume > 0 ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-rose-400" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={masterVolume}
            onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
            className="w-16 accent-emerald-500 h-1 bg-zinc-700 rounded cursor-pointer"
            title={`Volume: ${Math.round(masterVolume * 100)}%`}
          />
        </div>

        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* Theme Toggle Button */}
        {onToggleColorTheme && (
          <button
            onClick={onToggleColorTheme}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded font-semibold text-xs transition shadow-sm"
            title={`Toggle Theme (Current: ${colorTheme === 'light' ? 'Light' : 'Dark'})`}
          >
            {colorTheme === 'light' ? (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{colorTheme === 'light' ? 'Dark' : 'Light'}</span>
          </button>
        )}

        {/* GUI Mode Switcher */}
        <div className="flex items-center gap-1">
          {onSwitchGuiMode ? (
            <>
              <button
                onClick={() => onSwitchGuiMode('classic')}
                className={`flex items-center gap-1 px-2 py-1 rounded font-semibold text-xs transition border ${
                  guiMode === 'classic'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : isLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-amber-300'
                }`}
                title="Switch to hUGETracker 1:1 Desktop GUI"
              >
                <Disc className="w-3.5 h-3.5 text-amber-400" />
                <span>hUGE 1:1</span>
              </button>

              <button
                onClick={() => onSwitchGuiMode('furnace')}
                className={`flex items-center gap-1 px-2 py-1 rounded font-semibold text-xs transition border ${
                  guiMode === 'furnace'
                    ? 'bg-cyan-600 text-white border-cyan-500'
                    : isLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-cyan-300'
                }`}
                title="Switch to Furnace Tracker GUI"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Furnace</span>
              </button>

              <button
                onClick={() => onSwitchGuiMode('mobile')}
                className={`flex items-center gap-1 px-2 py-1 rounded font-semibold text-xs transition border ${
                  guiMode === 'mobile'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : isLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-emerald-400'
                }`}
                title="Switch to Mobile Touch DAW Interface"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mobile</span>
              </button>
            </>
          ) : (
            onToggleGuiMode && (
              <button
                onClick={onToggleGuiMode}
                className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-300 rounded font-semibold text-xs transition shadow-sm"
                title="Switch GUI"
              >
                <Disc className="w-3.5 h-3.5 text-amber-400" />
                <span>Switch UI</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
};
