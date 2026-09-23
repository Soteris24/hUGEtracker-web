import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Square,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Copy,
  Scissors,
  Clipboard,
  Music,
  Sliders,
  Activity,
  ListOrdered,
  Settings,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  Code,
  Wand2,
  Sun,
  Moon,
  Smartphone,
  Layers,
} from 'lucide-react';
import {
  TSong,
  TCell,
  NO_NOTE,
  TDutyInstrument,
  TWaveInstrument,
  TNoiseInstrument,
} from '../types/uge';
import { EFFECT_INFO } from './EffectEditorModal';
import { PWAInstallButton } from './PWAInstallButton';

interface MobileHugeTrackerGuiProps {
  song: TSong;
  currentOrder: number;
  cursorRow: number;
  cursorChannel: number;
  cursorColumn: number;
  currentOctave: number;
  currentInstrument: number;
  currentStep: number;
  mutedChannels: boolean[];
  soloChannels: boolean[];
  playbackState: { isPlaying: boolean; row: number; orderIndex?: number; order?: number };
  onUpdateSong: (updates: Partial<TSong>) => void;
  onUpdateCell: (channel: number, row: number, cellUpdates: Partial<TCell>) => void;
  onCursorChange: (row: number, channel: number, column: number) => void;
  onSelectOrder: (orderIndex: number) => void;
  onInsertOrder: (index: number, cloneCurrent?: boolean) => void;
  onDeleteOrder: (index: number) => void;
  onMoveOrder: (index: number, direction: 'up' | 'down') => void;
  onUpdateOrderCell: (channel: number, orderIndex: number, patternIndex: number) => void;
  onToggleMute: (channel: number) => void;
  onToggleSolo: (channel: number) => void;
  onPlay: (fromCursor?: boolean) => void;
  onStop: () => void;
  onPreviewNote: (channel: number, note: number, instrument: number) => void;
  onNewSong: () => void;
  onExportGBDK: () => void;
  onSaveUGE: () => void;
  onLoadUGE: (file: File) => void;
  onLoadSampleSong: (path: string) => void;
  onOpenEffectHelper: (channel: number, row: number) => void;
  onSetOctave: (octave: number) => void;
  onSetInstrument: (instIndex: number) => void;
  onSetStep: (step: number) => void;
  guiMode: 'classic' | 'modern' | 'furnace' | 'mobile';
  onToggleGuiMode: () => void;
  onSwitchGuiMode?: (mode: 'classic' | 'modern' | 'furnace' | 'mobile') => void;
}

const NOTE_NAMES = [
  'C-3', 'C#3', 'D-3', 'D#3', 'E-3', 'F-3', 'F#3', 'G-3', 'G#3', 'A-3', 'A#3', 'B-3',
  'C-4', 'C#4', 'D-4', 'D#4', 'E-4', 'F-4', 'F#4', 'G-4', 'G#4', 'A-4', 'A#4', 'B-4',
  'C-5', 'C#5', 'D-5', 'D#5', 'E-5', 'F-5', 'F#5', 'G-5', 'G#5', 'A-5', 'A#5', 'B-5',
  'C-6', 'C#6', 'D-6', 'D#6', 'E-6', 'F-6', 'F#6', 'G-6', 'G#6', 'A-6', 'A#6', 'B-6',
  'C-7', 'C#7', 'D-7', 'D#7', 'E-7', 'F-7', 'F#7', 'G-7', 'G#7', 'A-7', 'A#7', 'B-7',
  'C-8', 'C#8', 'D-8', 'D#8', 'E-8', 'F-8', 'F#8', 'G-8', 'G#8', 'A-8', 'A#8', 'B-8',
];

const PIANO_KEYS = [
  { noteOffset: 0, name: 'C', isBlack: false },
  { noteOffset: 1, name: 'C#', isBlack: true },
  { noteOffset: 2, name: 'D', isBlack: false },
  { noteOffset: 3, name: 'D#', isBlack: true },
  { noteOffset: 4, name: 'E', isBlack: false },
  { noteOffset: 5, name: 'F', isBlack: false },
  { noteOffset: 6, name: 'F#', isBlack: true },
  { noteOffset: 7, name: 'G', isBlack: false },
  { noteOffset: 8, name: 'G#', isBlack: true },
  { noteOffset: 9, name: 'A', isBlack: false },
  { noteOffset: 10, name: 'A#', isBlack: true },
  { noteOffset: 11, name: 'B', isBlack: false },
  { noteOffset: 12, name: 'C+', isBlack: false },
];

const NOISE_DRUM_PADS = [
  { note: 12, label: 'Kick', color: 'bg-red-600 hover:bg-red-500' },
  { note: 24, label: 'Snare', color: 'bg-amber-600 hover:bg-amber-500' },
  { note: 36, label: 'Hi-Hat', color: 'bg-yellow-600 hover:bg-yellow-500' },
  { note: 48, label: 'Open Hat', color: 'bg-emerald-600 hover:bg-emerald-500' },
  { note: 55, label: 'Crash', color: 'bg-blue-600 hover:bg-blue-500' },
  { note: 62, label: 'Laser', color: 'bg-purple-600 hover:bg-purple-500' },
];

export const MobileHugeTrackerGui: React.FC<MobileHugeTrackerGuiProps> = ({
  song,
  currentOrder,
  cursorRow,
  cursorChannel,
  cursorColumn,
  currentOctave,
  currentInstrument,
  currentStep,
  mutedChannels,
  soloChannels,
  playbackState,
  onUpdateSong,
  onUpdateCell,
  onCursorChange,
  onSelectOrder,
  onInsertOrder,
  onDeleteOrder,
  onMoveOrder,
  onUpdateOrderCell,
  onToggleMute,
  onToggleSolo,
  onPlay,
  onStop,
  onPreviewNote,
  onNewSong,
  onExportGBDK,
  onSaveUGE,
  onLoadUGE,
  onLoadSampleSong,
  onOpenEffectHelper,
  onSetOctave,
  onSetInstrument,
  onSetStep,
  guiMode,
  onToggleGuiMode,
  onSwitchGuiMode,
}) => {
  // Mobile Navigation Tabs: 'tracker' | 'instruments' | 'waves' | 'orders' | 'settings'
  const [mobileTab, setMobileTab] = useState<'tracker' | 'instruments' | 'waves' | 'orders' | 'settings'>('tracker');
  
  // Channel view in tracker: 0 (CH1), 1 (CH2), 2 (CH3), 3 (CH4), or -1 (All channels)
  const [focusedChannel, setFocusedChannel] = useState<number>(0);
  const [isAllChannelsView, setIsAllChannelsView] = useState<boolean>(false);

  // Selected Instrument in Mobile Instrument Tab: 0 (Duty), 1 (Wave), 2 (Noise)
  const [selectedInstType, setSelectedInstType] = useState<0 | 1 | 2>(0);
  const [selectedInstIndex, setSelectedInstIndex] = useState<number>(0);

  // Selected Wave in Mobile Wave Tab
  const [selectedWaveIndex, setSelectedWaveIndex] = useState<number>(0);
  const [isDrawingWave, setIsDrawingWave] = useState<boolean>(false);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Clipboard for mobile Cut/Copy/Paste
  const [clipboardCell, setClipboardCell] = useState<TCell | null>(null);

  // Auto-scroll pattern list
  const activeRowRef = useRef<HTMLDivElement | null>(null);
  const patternListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeRowRef.current && patternListRef.current) {
      activeRowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [cursorRow, playbackState.row, playbackState.isPlaying]);

  // Handle Piano Key Tap
  const handlePianoKeyTap = (noteOffset: number) => {
    const baseNote = (currentOctave - 3) * 12;
    const targetNote = baseNote + noteOffset;

    if (targetNote >= 0 && targetNote < 72) {
      const activeCh = isAllChannelsView ? cursorChannel : focusedChannel;
      onUpdateCell(activeCh, cursorRow, {
        note: targetNote,
        instrument: currentInstrument,
      });
      onPreviewNote(activeCh, targetNote, currentInstrument);
      
      if (currentStep > 0) {
        onCursorChange(Math.min(63, cursorRow + currentStep), activeCh, cursorColumn);
      }
    }
  };

  // Handle Drum Pad Tap (for Noise Channel)
  const handleDrumPadTap = (targetNote: number) => {
    const activeCh = 3; // Noise channel
    onUpdateCell(activeCh, cursorRow, {
      note: targetNote,
      instrument: currentInstrument,
    });
    onPreviewNote(activeCh, targetNote, currentInstrument);
    if (currentStep > 0) {
      onCursorChange(Math.min(63, cursorRow + currentStep), activeCh, cursorColumn);
    }
  };

  // Note Cut / Off Tap
  const handleNoteOff = () => {
    const activeCh = isAllChannelsView ? cursorChannel : focusedChannel;
    onUpdateCell(activeCh, cursorRow, { note: NO_NOTE });
    if (currentStep > 0) {
      onCursorChange(Math.min(63, cursorRow + currentStep), activeCh, cursorColumn);
    }
  };

  // Clear current cell
  const handleClearCell = () => {
    const activeCh = isAllChannelsView ? cursorChannel : focusedChannel;
    onUpdateCell(activeCh, cursorRow, {
      note: NO_NOTE,
      instrument: 0,
      volume: 0,
      effectCode: 0,
      effectParams: 0,
    });
  };

  // Mobile Cut / Copy / Paste
  const handleCut = () => {
    const activeCh = isAllChannelsView ? cursorChannel : focusedChannel;
    const patIdx = song.orderMatrix[activeCh]?.[currentOrder] ?? 0;
    const cell = song.patterns[patIdx]?.[cursorRow];
    if (cell) setClipboardCell({ ...cell });
    handleClearCell();
  };

  const handleCopy = () => {
    const activeCh = isAllChannelsView ? cursorChannel : focusedChannel;
    const patIdx = song.orderMatrix[activeCh]?.[currentOrder] ?? 0;
    const cell = song.patterns[patIdx]?.[cursorRow];
    if (cell) setClipboardCell({ ...cell });
  };

  const handlePaste = () => {
    if (clipboardCell) {
      const activeCh = isAllChannelsView ? cursorChannel : focusedChannel;
      onUpdateCell(activeCh, cursorRow, { ...clipboardCell });
    }
  };

  // Insert Row (Push down)
  const handleInsertRow = () => {
    const activeCh = isAllChannelsView ? cursorChannel : focusedChannel;
    const patIdx = song.orderMatrix[activeCh]?.[currentOrder] ?? 0;
    const curPat = song.patterns[patIdx] ? [...song.patterns[patIdx]] : [];
    for (let r = 63; r > cursorRow; r--) {
      curPat[r] = { ...curPat[r - 1] };
    }
    curPat[cursorRow] = { note: NO_NOTE, instrument: 0, volume: 0, effectCode: 0, effectParams: 0 };
    onUpdateSong({
      patterns: { ...song.patterns, [patIdx]: curPat },
    });
  };

  // Delete Row (Pull up)
  const handleDeleteRow = () => {
    const activeCh = isAllChannelsView ? cursorChannel : focusedChannel;
    const patIdx = song.orderMatrix[activeCh]?.[currentOrder] ?? 0;
    const curPat = song.patterns[patIdx] ? [...song.patterns[patIdx]] : [];
    for (let r = cursorRow; r < 63; r++) {
      curPat[r] = { ...curPat[r + 1] };
    }
    curPat[63] = { note: NO_NOTE, instrument: 0, volume: 0, effectCode: 0, effectParams: 0 };
    onUpdateSong({
      patterns: { ...song.patterns, [patIdx]: curPat },
    });
  };

  // Redraw Wave Canvas for Touch
  const drawWaveCanvas = useCallback(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Dark grid background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 32; i++) {
      const x = (i / 32) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let j = 0; j <= 16; j++) {
      const y = (j / 16) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const currentWave = song.waves[selectedWaveIndex] || new Array(32).fill(0);
    const stepW = w / 32;

    // Draw wave bars
    for (let i = 0; i < 32; i++) {
      const val = currentWave[i] || 0;
      const barH = (val / 15) * (h - 10);
      const x = i * stepW;
      const y = h - barH;

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x + 1, y, stepW - 2, barH);

      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(x + 1, y, stepW - 2, 3);
    }
  }, [song.waves, selectedWaveIndex]);

  useEffect(() => {
    if (mobileTab === 'waves') {
      drawWaveCanvas();
    }
  }, [mobileTab, selectedWaveIndex, song.waves, drawWaveCanvas]);

  const handleWaveTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const clientX = touch.clientX - rect.left;
    const clientY = touch.clientY - rect.top;

    const sampleIdx = Math.max(0, Math.min(31, Math.floor((clientX / rect.width) * 32)));
    const sampleVal = Math.max(0, Math.min(15, 15 - Math.floor((clientY / rect.height) * 16)));

    const curWaves = [...song.waves];
    const targetWave = curWaves[selectedWaveIndex] ? [...curWaves[selectedWaveIndex]] : new Array(32).fill(0);
    targetWave[sampleIdx] = sampleVal;
    curWaves[selectedWaveIndex] = targetWave;

    onUpdateSong({ waves: curWaves });
  };

  const applyWavePreset = (presetName: string) => {
    const curWaves = [...song.waves];
    const newWave = new Array(32).fill(0);

    if (presetName === 'sine') {
      for (let i = 0; i < 32; i++) {
        newWave[i] = Math.round(7.5 + 7.5 * Math.sin((i / 32) * Math.PI * 2));
      }
    } else if (presetName === 'saw') {
      for (let i = 0; i < 32; i++) {
        newWave[i] = Math.floor((i / 32) * 16);
      }
    } else if (presetName === 'triangle') {
      for (let i = 0; i < 32; i++) {
        newWave[i] = i < 16 ? Math.floor((i / 16) * 15) : Math.floor(((32 - i) / 16) * 15);
      }
    } else if (presetName === 'square') {
      for (let i = 0; i < 32; i++) {
        newWave[i] = i < 16 ? 15 : 0;
      }
    } else if (presetName === 'pulse12') {
      for (let i = 0; i < 32; i++) {
        newWave[i] = i < 4 ? 15 : 0;
      }
    } else if (presetName === 'organ') {
      for (let i = 0; i < 32; i++) {
        const s1 = Math.sin((i / 32) * Math.PI * 2);
        const s2 = 0.5 * Math.sin((i / 32) * Math.PI * 4);
        newWave[i] = Math.max(0, Math.min(15, Math.round(7.5 + 5 * (s1 + s2))));
      }
    }

    curWaves[selectedWaveIndex] = newWave;
    onUpdateSong({ waves: curWaves });
    onPreviewNote(2, 24, selectedWaveIndex + 1);
  };

  // Helper for current instrument object
  const getCurrentInstrumentObj = () => {
    if (selectedInstType === 0) return song.dutyInstruments[selectedInstIndex] as TDutyInstrument;
    if (selectedInstType === 1) return song.waveInstruments[selectedInstIndex] as TWaveInstrument;
    return song.noiseInstruments[selectedInstIndex] as TNoiseInstrument;
  };

  const updateCurrentInstrumentObj = (updates: any) => {
    if (selectedInstType === 0) {
      const list = [...song.dutyInstruments];
      list[selectedInstIndex] = { ...list[selectedInstIndex], ...updates };
      onUpdateSong({ dutyInstruments: list });
    } else if (selectedInstType === 1) {
      const list = [...song.waveInstruments];
      list[selectedInstIndex] = { ...list[selectedInstIndex], ...updates };
      onUpdateSong({ waveInstruments: list });
    } else {
      const list = [...song.noiseInstruments];
      list[selectedInstIndex] = { ...list[selectedInstIndex], ...updates };
      onUpdateSong({ noiseInstruments: list });
    }
  };

  const activeChannelIndex = isAllChannelsView ? cursorChannel : focusedChannel;
  const channelNames = ['Duty 1', 'Duty 2', 'Wave', 'Noise'];

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f172a] text-zinc-100 select-none overflow-hidden touch-manipulation font-sans">
      {/* 1. Mobile Top App Bar */}
      <header className="flex items-center justify-between px-3 py-2 bg-[#1e293b] border-b border-slate-700/80 shrink-0 gap-2">
        {/* Logo & Song Info */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-amber-400 text-black px-1.5 py-0.5 font-bold font-mono text-xs rounded shadow-xs">
            hT
          </span>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs truncate leading-tight text-white">
              {song.name || 'Untitled Song'}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              Ord {currentOrder + 1}/{Math.max(1, song.orderMatrix[0]?.length || 1)} • {song.ticksPerRow || 6} TPR
            </span>
          </div>
        </div>

        {/* Action Buttons: Play / Stop / New / PWA Install / Mode Switcher */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              if (window.confirm('Create a new blank .uge song? Any unsaved changes will be lost.')) {
                onNewSong();
              }
            }}
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold border border-slate-600 active:scale-95"
            title="Create New Song (.uge)"
          >
            + New
          </button>

          <PWAInstallButton className="text-[11px] py-1 px-2" />

          <button
            onClick={() => (playbackState.isPlaying ? onStop() : onPlay())}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-xs shadow-md transition active:scale-95 ${
              playbackState.isPlaying
                ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {playbackState.isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{playbackState.isPlaying ? 'Stop' : 'Play'}</span>
          </button>

          {/* Mode Switcher */}
          <select
            value={guiMode}
            onChange={(e) => {
              const mode = e.target.value as 'classic' | 'modern' | 'furnace' | 'mobile';
              if (onSwitchGuiMode) {
                onSwitchGuiMode(mode);
              } else {
                onToggleGuiMode();
              }
            }}
            className="px-1.5 py-1 bg-slate-800 text-slate-200 border border-slate-600 rounded text-[11px] font-bold"
            title="Switch UI"
          >
            <option value="mobile">Mobile DAW</option>
            <option value="modern">Modern Studio</option>
            <option value="classic">hUGE 1:1</option>
            <option value="furnace">Furnace GUI</option>
          </select>
        </div>
      </header>

      {/* 2. Main Tab View Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* ========================================================================= */}
        {/* TAB 1: Mobile Pattern Tracker */}
        {/* ========================================================================= */}
        {mobileTab === 'tracker' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Quick Order & Pattern Selector Ribbon */}
            <div className="flex items-center justify-between bg-[#131d31] border-b border-slate-800 px-2 py-1.5 shrink-0 text-xs gap-1">
              {/* Order Stepper */}
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Order:</span>
                <button
                  onClick={() => onSelectOrder(Math.max(0, currentOrder - 1))}
                  disabled={currentOrder === 0}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 active:scale-95"
                  title="Previous Order"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-xs">
                  {(currentOrder + 1).toString().padStart(2, '0')}/{(song.orderMatrix[0]?.length || 1).toString().padStart(2, '0')}
                </span>
                <button
                  onClick={() => onSelectOrder(Math.min((song.orderMatrix[0]?.length || 1) - 1, currentOrder + 1))}
                  disabled={currentOrder >= (song.orderMatrix[0]?.length || 1) - 1}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 active:scale-95"
                  title="Next Order"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Pattern Assignment for Active Channel */}
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-bold text-[10px] uppercase">
                  CH{focusedChannel + 1} Pat:
                </span>
                <button
                  onClick={() => {
                    const curPat = song.orderMatrix[focusedChannel]?.[currentOrder] ?? 0;
                    if (curPat > 0) onUpdateOrderCell(focusedChannel, currentOrder, curPat - 1);
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs active:scale-95"
                  title="Previous Pattern Number"
                >
                  -
                </button>
                <span className="font-mono font-bold text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-xs">
                  {song.orderMatrix[focusedChannel]?.[currentOrder] ?? 0}
                </span>
                <button
                  onClick={() => {
                    const curPat = song.orderMatrix[focusedChannel]?.[currentOrder] ?? 0;
                    onUpdateOrderCell(focusedChannel, currentOrder, curPat + 1);
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs active:scale-95"
                  title="Next Pattern Number"
                >
                  +
                </button>

                <button
                  onClick={() => onInsertOrder(currentOrder + 1, false)}
                  className="ml-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold shadow-xs flex items-center gap-0.5 active:scale-95"
                  title="Insert New Order Pattern"
                >
                  <Plus className="w-3 h-3" />
                  <span>Order</span>
                </button>
              </div>
            </div>

            {/* Channel Tabs & Mute Ribbon */}
            <div className="flex items-center bg-[#0b1120] border-b border-slate-800 px-1 py-1 gap-1 overflow-x-auto shrink-0">
              {['CH1 Duty 1', 'CH2 Duty 2', 'CH3 Wave', 'CH4 Noise'].map((label, ch) => {
                const isSelected = !isAllChannelsView && focusedChannel === ch;
                const isSolo = soloChannels[ch];
                const isMute = mutedChannels[ch];

                return (
                  <button
                    key={ch}
                    onClick={() => {
                      setIsAllChannelsView(false);
                      setFocusedChannel(ch);
                      onCursorChange(cursorRow, ch, cursorColumn);
                    }}
                    className={`flex-1 min-w-[76px] py-1.5 px-2 rounded flex flex-col items-center justify-center text-[11px] font-bold transition ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span>CH{ch + 1}</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleMute(ch);
                        }}
                        className="p-0.5 hover:opacity-80"
                      >
                        {isMute ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-slate-400" />}
                      </span>
                    </div>
                    <span className="text-[9px] font-normal opacity-80 truncate">
                      Pat {song.orderMatrix[ch]?.[currentOrder] ?? 0}
                    </span>
                  </button>
                );
              })}

              <button
                onClick={() => {
                  setIsAllChannelsView(!isAllChannelsView);
                }}
                className={`py-1.5 px-2 rounded text-[10px] font-bold shrink-0 transition ${
                  isAllChannelsView
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-slate-800/70 text-slate-400 hover:text-white'
                }`}
                title="Toggle 4-Channel View"
              >
                <Layers className="w-3.5 h-3.5 mx-auto" />
                <span>All 4</span>
              </button>
            </div>

            {/* Quick Action & Navigation Ribbon */}
            <div className="flex items-center justify-between px-2 py-1 bg-[#1e293b]/90 border-b border-slate-700/80 text-xs shrink-0 gap-1 overflow-x-auto">
              <div className="flex items-center gap-1">
                {/* Octave Selector */}
                <span className="text-[10px] text-slate-400 font-bold">Oct:</span>
                <button
                  onClick={() => onSetOctave(Math.max(3, currentOctave - 1))}
                  className="w-6 h-6 bg-slate-800 rounded font-bold hover:bg-slate-700 text-white flex items-center justify-center active:scale-95"
                >
                  -
                </button>
                <span className="font-mono font-bold text-amber-400 text-xs px-0.5">{currentOctave}</span>
                <button
                  onClick={() => onSetOctave(Math.min(8, currentOctave + 1))}
                  className="w-6 h-6 bg-slate-800 rounded font-bold hover:bg-slate-700 text-white flex items-center justify-center active:scale-95"
                >
                  +
                </button>

                {/* Step Selector */}
                <span className="text-[10px] text-slate-400 font-bold ml-1">Step:</span>
                <button
                  onClick={() => onSetStep(currentStep === 0 ? 1 : currentStep === 1 ? 2 : currentStep === 2 ? 4 : 0)}
                  className="px-1.5 h-6 bg-slate-800 rounded font-mono text-xs font-bold text-cyan-400 hover:bg-slate-700 active:scale-95"
                >
                  {currentStep}
                </button>

                {/* Instrument Selector */}
                <span className="text-[10px] text-slate-400 font-bold ml-1">Inst:</span>
                <button
                  onClick={() => onSetInstrument((currentInstrument % 15) + 1)}
                  className="px-1.5 h-6 bg-slate-800 rounded font-mono text-xs font-bold text-emerald-400 hover:bg-slate-700 active:scale-95"
                >
                  {currentInstrument.toString(16).toUpperCase().padStart(2, '0')}
                </button>
              </div>

              {/* Editing Actions: Clear, Cut, Copy, Paste, FX */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearCell}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold active:scale-95"
                  title="Clear Cell"
                >
                  CLR
                </button>
                <button
                  onClick={handleCut}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded active:scale-95"
                  title="Cut"
                >
                  <Scissors className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded active:scale-95"
                  title="Copy"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handlePaste}
                  disabled={!clipboardCell}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded disabled:opacity-30 active:scale-95"
                  title="Paste"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onOpenEffectHelper(activeChannelIndex, cursorRow)}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold active:scale-95 flex items-center gap-0.5"
                  title="Effect Assistant"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>FX</span>
                </button>
              </div>
            </div>

            {/* Pattern Grid Rows Scroll Container */}
            <div
              ref={patternListRef}
              className="flex-1 overflow-y-auto bg-[#0b0f19] divide-y divide-slate-800/40 font-mono text-xs select-none"
            >
              {Array.from({ length: 64 }, (_, r) => {
                const isBar = r % 16 === 0;
                const isBeat = r % 4 === 0 && !isBar;
                const isCursor = cursorRow === r;
                const isPlaying = playbackState.isPlaying && playbackState.row === r;

                // Single Focused Channel View or All 4 Channel View
                if (!isAllChannelsView) {
                  const patIdx = song.orderMatrix[focusedChannel]?.[currentOrder] ?? 0;
                  const cell = song.patterns[patIdx]?.[r] || {
                    note: NO_NOTE,
                    instrument: 0,
                    volume: 0,
                    effectCode: 0,
                    effectParams: 0,
                  };

                  const noteStr =
                    cell.note !== undefined && cell.note !== NO_NOTE && cell.note < 72
                      ? NOTE_NAMES[cell.note]
                      : '---';
                  const instStr = cell.instrument > 0 ? cell.instrument.toString(16).toUpperCase().padStart(2, '0') : '..';
                  const volStr = cell.volume > 0 ? `v${cell.volume.toString(16).toUpperCase()}` : '...';
                  const effStr =
                    cell.effectCode > 0 || cell.effectParams > 0
                      ? `${cell.effectCode.toString(16).toUpperCase()}${cell.effectParams.toString(16).toUpperCase().padStart(2, '0')}`
                      : '...';

                  return (
                    <div
                      key={r}
                      ref={isCursor ? activeRowRef : null}
                      onClick={() => onCursorChange(r, focusedChannel, 0)}
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                        isPlaying
                          ? 'bg-emerald-900/80 text-emerald-100 font-bold'
                          : isCursor
                          ? 'bg-blue-600 text-white font-bold shadow-inner'
                          : isBar
                          ? 'bg-slate-800/80 text-amber-300 font-bold'
                          : isBeat
                          ? 'bg-slate-900/90 text-slate-200'
                          : 'hover:bg-slate-800/40 text-slate-300'
                      }`}
                    >
                      {/* Row Index */}
                      <span className={`w-8 font-bold text-left ${isBar ? 'text-amber-400' : 'text-slate-500'}`}>
                        {r.toString().padStart(2, '0')}
                      </span>

                      {/* Note */}
                      <span
                        className={`text-sm font-black tracking-wider ${
                          cell.note !== NO_NOTE ? (isCursor ? 'text-white' : 'text-amber-300') : 'opacity-40'
                        }`}
                      >
                        {noteStr}
                      </span>

                      {/* Instrument */}
                      <span className={`text-xs ${cell.instrument > 0 ? 'text-emerald-400 font-bold' : 'opacity-40'}`}>
                        I:{instStr}
                      </span>

                      {/* Volume */}
                      <span className={`text-xs ${cell.volume > 0 ? 'text-cyan-400 font-bold' : 'opacity-40'}`}>
                        {volStr}
                      </span>

                      {/* Effect */}
                      <span className={`text-xs ${cell.effectCode > 0 ? 'text-purple-400 font-bold' : 'opacity-40'}`}>
                        {effStr}
                      </span>
                    </div>
                  );
                } else {
                  // 4-Channel View on Mobile
                  return (
                    <div
                      key={r}
                      ref={isCursor ? activeRowRef : null}
                      className={`grid grid-cols-[28px_repeat(4,1fr)] items-center px-1 py-1.5 cursor-pointer text-[10px] ${
                        isPlaying
                          ? 'bg-emerald-900/80 text-white'
                          : isCursor
                          ? 'bg-blue-950/60'
                          : isBar
                          ? 'bg-slate-800/80 text-amber-300'
                          : isBeat
                          ? 'bg-slate-900/90'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <span className={`text-center font-bold ${isBar ? 'text-amber-400' : 'text-slate-500'}`}>
                        {r.toString().padStart(2, '0')}
                      </span>
                      {[0, 1, 2, 3].map((ch) => {
                        const patIdx = song.orderMatrix[ch]?.[currentOrder] ?? 0;
                        const cell = song.patterns[patIdx]?.[r] || {
                          note: NO_NOTE,
                          instrument: 0,
                          volume: 0,
                          effectCode: 0,
                          effectParams: 0,
                        };
                        const isCellSelected = cursorRow === r && cursorChannel === ch;
                        const noteStr =
                          cell.note !== undefined && cell.note !== NO_NOTE && cell.note < 72
                            ? NOTE_NAMES[cell.note]
                            : '...';

                        return (
                          <div
                            key={ch}
                            onClick={() => onCursorChange(r, ch, 0)}
                            className={`p-1 text-center rounded truncate font-mono ${
                              isCellSelected
                                ? 'bg-blue-600 text-white font-bold'
                                : cell.note !== NO_NOTE
                                ? 'text-amber-300 font-bold'
                                : 'text-slate-500'
                            }`}
                          >
                            {noteStr}
                          </div>
                        );
                      })}
                    </div>
                  );
                }
              })}
            </div>

            {/* Quick Row Navigation Toolbar */}
            <div className="flex items-center justify-between px-3 py-1 bg-[#1e293b] border-t border-slate-700/80 text-xs shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onCursorChange(Math.max(0, cursorRow - 16), activeChannelIndex, cursorColumn)}
                  className="px-2 py-0.5 bg-slate-800 rounded font-bold text-slate-300 hover:text-white"
                >
                  -16
                </button>
                <button
                  onClick={() => onCursorChange(Math.max(0, cursorRow - 4), activeChannelIndex, cursorColumn)}
                  className="px-2 py-0.5 bg-slate-800 rounded font-bold text-slate-300 hover:text-white"
                >
                  -4
                </button>
                <button
                  onClick={() => onCursorChange(Math.max(0, cursorRow - 1), activeChannelIndex, cursorColumn)}
                  className="px-2 py-0.5 bg-slate-800 rounded font-bold text-slate-300 hover:text-white"
                >
                  ▲
                </button>
              </div>

              <span className="font-mono font-bold text-xs text-amber-400">
                Row {cursorRow.toString().padStart(2, '0')} / 63
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onCursorChange(Math.min(63, cursorRow + 1), activeChannelIndex, cursorColumn)}
                  className="px-2 py-0.5 bg-slate-800 rounded font-bold text-slate-300 hover:text-white"
                >
                  ▼
                </button>
                <button
                  onClick={() => onCursorChange(Math.min(63, cursorRow + 4), activeChannelIndex, cursorColumn)}
                  className="px-2 py-0.5 bg-slate-800 rounded font-bold text-slate-300 hover:text-white"
                >
                  +4
                </button>
                <button
                  onClick={() => onCursorChange(Math.min(63, cursorRow + 16), activeChannelIndex, cursorColumn)}
                  className="px-2 py-0.5 bg-slate-800 rounded font-bold text-slate-300 hover:text-white"
                >
                  +16
                </button>
              </div>
            </div>

            {/* Interactive On-Screen Touch Piano Keyboard / Noise Drum Pads */}
            <div className="bg-[#0f172a] border-t-2 border-slate-700 p-1.5 shrink-0">
              {/* Noise Channel Drum Pads Mode */}
              {activeChannelIndex === 3 ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px] px-1 text-slate-400 font-bold">
                    <span>Game Boy Noise Drum Pads</span>
                    <button
                      onClick={handleNoteOff}
                      className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded font-bold active:scale-95"
                    >
                      Note Cut (OFF)
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {NOISE_DRUM_PADS.map((pad, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleDrumPadTap(pad.note)}
                        className={`py-3 rounded-lg font-bold text-xs text-white shadow-md active:scale-95 transition ${pad.color}`}
                      >
                        {pad.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Melodic Channels Piano Keyboard Mode */
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] px-1 text-slate-400 font-bold">
                    <span>Touch Keys (Octave {currentOctave})</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleNoteOff}
                        className="px-2 py-0.5 bg-red-800/90 hover:bg-red-700 text-white rounded font-bold active:scale-95"
                      >
                        OFF
                      </button>
                      <button
                        onClick={handleInsertRow}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold active:scale-95"
                      >
                        +Row
                      </button>
                      <button
                        onClick={handleDeleteRow}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold active:scale-95"
                      >
                        -Row
                      </button>
                    </div>
                  </div>

                  {/* Piano Keyboard Container */}
                  <div className="relative h-28 w-full flex bg-black rounded-lg overflow-hidden border border-slate-700 shadow-inner">
                    {/* White Keys */}
                    {PIANO_KEYS.filter((k) => !k.isBlack).map((k, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePianoKeyTap(k.noteOffset)}
                        className="flex-1 bg-white hover:bg-slate-100 active:bg-amber-300 border-r border-slate-400 last:border-r-0 flex flex-col justify-end items-center pb-2 text-slate-800 font-bold text-xs select-none transition"
                      >
                        <span>{k.name}</span>
                      </button>
                    ))}

                    {/* Black Keys (Positioned Absolutely) */}
                    <div className="absolute inset-0 pointer-events-none flex">
                      <div className="w-[12.5%] relative">
                        <button
                          onClick={() => handlePianoKeyTap(1)}
                          className="pointer-events-auto absolute right-[-28%] top-0 w-[56%] h-[60%] bg-zinc-900 active:bg-amber-500 rounded-b-sm border border-black z-10 flex flex-col justify-end items-center pb-1 text-[9px] font-bold text-white shadow-md"
                        >
                          C#
                        </button>
                      </div>
                      <div className="w-[12.5%] relative">
                        <button
                          onClick={() => handlePianoKeyTap(3)}
                          className="pointer-events-auto absolute right-[-28%] top-0 w-[56%] h-[60%] bg-zinc-900 active:bg-amber-500 rounded-b-sm border border-black z-10 flex flex-col justify-end items-center pb-1 text-[9px] font-bold text-white shadow-md"
                        >
                          D#
                        </button>
                      </div>
                      <div className="w-[12.5%] relative" />
                      <div className="w-[12.5%] relative">
                        <button
                          onClick={() => handlePianoKeyTap(6)}
                          className="pointer-events-auto absolute right-[-28%] top-0 w-[56%] h-[60%] bg-zinc-900 active:bg-amber-500 rounded-b-sm border border-black z-10 flex flex-col justify-end items-center pb-1 text-[9px] font-bold text-white shadow-md"
                        >
                          F#
                        </button>
                      </div>
                      <div className="w-[12.5%] relative">
                        <button
                          onClick={() => handlePianoKeyTap(8)}
                          className="pointer-events-auto absolute right-[-28%] top-0 w-[56%] h-[60%] bg-zinc-900 active:bg-amber-500 rounded-b-sm border border-black z-10 flex flex-col justify-end items-center pb-1 text-[9px] font-bold text-white shadow-md"
                        >
                          G#
                        </button>
                      </div>
                      <div className="w-[12.5%] relative">
                        <button
                          onClick={() => handlePianoKeyTap(10)}
                          className="pointer-events-auto absolute right-[-28%] top-0 w-[56%] h-[60%] bg-zinc-900 active:bg-amber-500 rounded-b-sm border border-black z-10 flex flex-col justify-end items-center pb-1 text-[9px] font-bold text-white shadow-md"
                        >
                          A#
                        </button>
                      </div>
                      <div className="w-[12.5%] relative" />
                      <div className="w-[12.5%] relative" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: Mobile Instruments Editor */}
        {/* ========================================================================= */}
        {mobileTab === 'instruments' && (
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 bg-[#0b0f19]">
            {/* Instrument Type Switcher (Duty, Wave, Noise) */}
            <div className="grid grid-cols-3 gap-1 bg-[#1e293b] p-1 rounded-lg">
              {(['Duty (Square)', 'Waveform', 'Noise'] as const).map((typeLabel, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedInstType(idx as 0 | 1 | 2);
                    setSelectedInstIndex(0);
                  }}
                  className={`py-2 text-xs font-bold rounded transition ${
                    selectedInstType === idx ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {typeLabel}
                </button>
              ))}
            </div>

            {/* Instrument Index Picker */}
            <div className="flex items-center justify-between bg-[#1e293b] p-3 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">Instrument #:</span>
                <select
                  value={selectedInstIndex}
                  onChange={(e) => setSelectedInstIndex(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-600 text-white px-3 py-1 rounded text-xs font-mono font-bold"
                >
                  {Array.from(
                    {
                      length:
                        selectedInstType === 0
                          ? song.dutyInstruments.length
                          : selectedInstType === 1
                          ? song.waveInstruments.length
                          : song.noiseInstruments.length,
                    },
                    (_, i) => (
                      <option key={i} value={i}>
                        {(i + 1).toString().padStart(2, '0')}: {getCurrentInstrumentObj()?.name || `Inst ${i + 1}`}
                      </option>
                    )
                  )}
                </select>
              </div>

              <button
                onClick={() => onPreviewNote(selectedInstType === 0 ? 0 : selectedInstType === 1 ? 2 : 3, 24, selectedInstIndex + 1)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow-md active:scale-95"
              >
                Audition Note
              </button>
            </div>

            {/* Instrument Parameters Card */}
            <div className="bg-[#1e293b] p-4 rounded-lg border border-slate-700 flex flex-col gap-3">
              {/* Instrument Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-300">Name</label>
                <input
                  type="text"
                  value={getCurrentInstrumentObj()?.name || ''}
                  onChange={(e) => updateCurrentInstrumentObj({ name: e.target.value })}
                  placeholder="Instrument name..."
                  className="bg-slate-900 border border-slate-700 text-white px-3 py-1.5 rounded text-xs"
                />
              </div>

              {/* Duty Specific Controls */}
              {selectedInstType === 0 && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-300">
                      Initial Volume: {(getCurrentInstrumentObj() as TDutyInstrument)?.initialVolume || 15} / 15
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={15}
                      value={(getCurrentInstrumentObj() as TDutyInstrument)?.initialVolume || 15}
                      onChange={(e) => updateCurrentInstrumentObj({ initialVolume: Number(e.target.value) })}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-300">
                      Duty Cycle / Timbre: {['12.5%', '25%', '50%', '75%'][(getCurrentInstrumentObj() as TDutyInstrument)?.duty || 0]}
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {[0, 1, 2, 3].map((d) => (
                        <button
                          key={d}
                          onClick={() => updateCurrentInstrumentObj({ duty: d })}
                          className={`py-1.5 rounded text-xs font-bold ${
                            (getCurrentInstrumentObj() as TDutyInstrument)?.duty === d
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {['12.5%', '25%', '50%', '75%'][d]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-300">
                      Volume Sweep Amount: {(getCurrentInstrumentObj() as TDutyInstrument)?.volSweepAmount || 0}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={7}
                      value={(getCurrentInstrumentObj() as TDutyInstrument)?.volSweepAmount || 0}
                      onChange={(e) => updateCurrentInstrumentObj({ volSweepAmount: Number(e.target.value) })}
                      className="w-full accent-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Wave Specific Controls */}
              {selectedInstType === 1 && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-300">Waveform (0..15)</label>
                    <select
                      value={(getCurrentInstrumentObj() as TWaveInstrument)?.waveform || 0}
                      onChange={(e) => updateCurrentInstrumentObj({ waveform: Number(e.target.value) })}
                      className="bg-slate-900 border border-slate-700 text-white px-3 py-1.5 rounded text-xs"
                    >
                      {Array.from({ length: 16 }, (_, i) => (
                        <option key={i} value={i}>
                          Wave {i}: Shape {i}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-300">
                      Volume Multiplier: {['Mute', '100%', '50%', '25%'][(getCurrentInstrumentObj() as TWaveInstrument)?.outputLevel || 0]}
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {[0, 1, 2, 3].map((v) => (
                        <button
                          key={v}
                          onClick={() => updateCurrentInstrumentObj({ outputLevel: v })}
                          className={`py-1.5 rounded text-xs font-bold ${
                            (getCurrentInstrumentObj() as TWaveInstrument)?.outputLevel === v
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {['Mute', '100%', '50%', '25%'][v]}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Noise Specific Controls */}
              {selectedInstType === 2 && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-300">
                      Initial Volume: {(getCurrentInstrumentObj() as TNoiseInstrument)?.initialVolume || 15} / 15
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={15}
                      value={(getCurrentInstrumentObj() as TNoiseInstrument)?.initialVolume || 15}
                      onChange={(e) => updateCurrentInstrumentObj({ initialVolume: Number(e.target.value) })}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-300">Noise Mode (LFSR Step Width)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => updateCurrentInstrumentObj({ counterStep: 0 })}
                        className={`py-2 rounded text-xs font-bold ${
                          (getCurrentInstrumentObj() as TNoiseInstrument)?.counterStep === 0
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        15-bit (White Noise / Drum)
                      </button>
                      <button
                        onClick={() => updateCurrentInstrumentObj({ counterStep: 1 })}
                        className={`py-2 rounded text-xs font-bold ${
                          (getCurrentInstrumentObj() as TNoiseInstrument)?.counterStep === 1
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        7-bit (Metallic / Buzz)
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: Mobile Waveform Touch Canvas */}
        {/* ========================================================================= */}
        {mobileTab === 'waves' && (
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 bg-[#0b0f19]">
            {/* Wave Selector & Audition */}
            <div className="flex items-center justify-between bg-[#1e293b] p-3 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">Wave #:</span>
                <select
                  value={selectedWaveIndex}
                  onChange={(e) => setSelectedWaveIndex(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-600 text-white px-3 py-1 rounded text-xs font-mono font-bold"
                >
                  {Array.from({ length: 16 }, (_, i) => (
                    <option key={i} value={i}>
                      Wave {i}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => onPreviewNote(2, 24, selectedWaveIndex + 1)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow-md active:scale-95"
              >
                Audition (C-3)
              </button>
            </div>

            {/* Quick Shape Presets */}
            <div className="bg-[#1e293b] p-3 rounded-lg border border-slate-700 flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">Quick Wave Presets</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'sine', label: 'Sine Wave' },
                  { id: 'triangle', label: 'Triangle' },
                  { id: 'saw', label: 'Sawtooth' },
                  { id: 'square', label: '50% Square' },
                  { id: 'pulse12', label: '12.5% Pulse' },
                  { id: 'organ', label: 'GB Organ' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyWavePreset(preset.id)}
                    className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold active:scale-95 transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Touch Draw Canvas */}
            <div className="bg-[#1e293b] p-3 rounded-lg border border-slate-700 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-bold">Draw Wave with Finger</span>
                <span className="text-[10px] text-slate-400">32 samples (4-bit 0..15)</span>
              </div>
              <div className="h-56 w-full rounded border border-slate-700 overflow-hidden relative shadow-inner">
                <canvas
                  ref={waveCanvasRef}
                  width={640}
                  height={240}
                  onTouchStart={(e) => {
                    setIsDrawingWave(true);
                    handleWaveTouchMove(e);
                  }}
                  onTouchMove={(e) => {
                    if (isDrawingWave) handleWaveTouchMove(e);
                  }}
                  onTouchEnd={() => setIsDrawingWave(false)}
                  className="w-full h-full cursor-crosshair touch-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: Mobile Order Matrix */}
        {/* ========================================================================= */}
        {mobileTab === 'orders' && (
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 bg-[#0b0f19]">
            <div className="flex items-center justify-between bg-[#1e293b] p-3 rounded-lg border border-slate-700">
              <span className="text-xs font-bold text-white">Song Order Matrix</span>
              <button
                onClick={() => onInsertOrder(currentOrder + 1, false)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center gap-1 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Order</span>
              </button>
            </div>

            {/* Order Cards List */}
            <div className="flex flex-col gap-2">
              {Array.from(
                {
                  length: Math.max(
                    song.orderMatrix[0]?.length || 1,
                    song.orderMatrix[1]?.length || 1,
                    song.orderMatrix[2]?.length || 1,
                    song.orderMatrix[3]?.length || 1
                  ),
                },
                (_, ordIdx) => {
                  const isSelected = currentOrder === ordIdx;

                  return (
                    <div
                      key={ordIdx}
                      onClick={() => onSelectOrder(ordIdx)}
                      className={`p-3 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition ${
                        isSelected
                          ? 'bg-blue-900/60 border-blue-500 shadow-md'
                          : 'bg-[#1e293b] border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {ordIdx + 1}
                        </span>

                        {/* Pattern Numbers per Channel */}
                        <div className="grid grid-cols-4 gap-1 text-center font-mono text-xs">
                          {[0, 1, 2, 3].map((ch) => {
                            const patIdx = song.orderMatrix[ch]?.[ordIdx] ?? 0;
                            return (
                              <div
                                key={ch}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextPat = prompt(
                                    `Set Pattern for Channel ${ch + 1}, Order ${ordIdx + 1}:`,
                                    patIdx.toString()
                                  );
                                  if (nextPat !== null && !isNaN(Number(nextPat))) {
                                    onUpdateOrderCell(ch, ordIdx, Math.max(0, Number(nextPat)));
                                  }
                                }}
                                className="px-2 py-1 bg-slate-900 rounded border border-slate-700"
                              >
                                <span className="text-[9px] text-slate-500 block">CH{ch + 1}</span>
                                <span className="font-bold text-white">{patIdx}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Order Controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInsertOrder(ordIdx + 1, true);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded active:scale-95"
                          title="Clone Order"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteOrder(ordIdx);
                          }}
                          className="p-1.5 bg-red-900/60 hover:bg-red-800 text-red-300 rounded active:scale-95"
                          title="Delete Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: Mobile Song Settings, File I/O & Export */}
        {/* ========================================================================= */}
        {mobileTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#0b0f19] text-xs">
            {/* Song Metadata Card */}
            <div className="bg-[#1e293b] p-4 rounded-lg border border-slate-700 flex flex-col gap-3">
              <span className="font-bold text-white text-sm">Song Information</span>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold">Song Name</label>
                <input
                  type="text"
                  value={song.name || ''}
                  onChange={(e) => onUpdateSong({ name: e.target.value })}
                  placeholder="Song Title"
                  className="bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold">Artist / Author</label>
                <input
                  type="text"
                  value={song.artist || ''}
                  onChange={(e) => onUpdateSong({ artist: e.target.value })}
                  placeholder="Composer name"
                  className="bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold">Comment</label>
                <input
                  type="text"
                  value={song.comment || ''}
                  onChange={(e) => onUpdateSong({ comment: e.target.value })}
                  placeholder="Optional song notes..."
                  className="bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded text-xs"
                />
              </div>
            </div>

            {/* Tempo & Speed Card */}
            <div className="bg-[#1e293b] p-4 rounded-lg border border-slate-700 flex flex-col gap-3">
              <span className="font-bold text-white text-sm">Tempo & Playback</span>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Ticks Per Row (Speed)</span>
                <input
                  type="number"
                  min={1}
                  max={32}
                  value={song.ticksPerRow || 6}
                  onChange={(e) => onUpdateSong({ ticksPerRow: Math.max(1, Number(e.target.value)) })}
                  className="w-16 bg-slate-900 border border-slate-700 text-white text-center py-1 rounded font-bold"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Calculated BPM</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {((60 * 59.7) / (song.ticksPerRow || 6)).toFixed(1)} BPM
                </span>
              </div>
            </div>

            {/* File Operations Card */}
            <div className="bg-[#1e293b] p-4 rounded-lg border border-slate-700 flex flex-col gap-2.5">
              <span className="font-bold text-white text-sm">Song Files & Export</span>
              
              <button
                onClick={() => {
                  if (window.confirm('Create a new blank .uge song? Any unsaved changes will be lost.')) {
                    onNewSong();
                  }
                }}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 rounded font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Create New Song (.uge)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onSaveUGE}
                  className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Save .uge</span>
                </button>

                <button
                  onClick={onExportGBDK}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                >
                  <Code className="w-4 h-4" />
                  <span>Export GBDK C</span>
                </button>
              </div>

              {/* Load .uge File Input */}
              <label className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-600 active:scale-95">
                <Upload className="w-4 h-4" />
                <span>Open .uge File</span>
                <input
                  type="file"
                  accept=".uge,.uge5,.uge6"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      onLoadUGE(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {/* Demo Songs */}
            <div className="bg-[#1e293b] p-4 rounded-lg border border-slate-700 flex flex-col gap-2">
              <span className="font-bold text-white text-sm">Demo Songs</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onLoadSampleSong('/sample-songs/boss.uge')}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold"
                >
                  Boss Theme
                </button>
                <button
                  onClick={() => onLoadSampleSong('/sample-songs/desert.uge')}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold"
                >
                  Desert Sands
                </button>
                <button
                  onClick={() => onLoadSampleSong('/sample-songs/menu.uge')}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold"
                >
                  Menu Theme
                </button>
                <button
                  onClick={() => onLoadSampleSong('/sample-songs/mountain.uge')}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold"
                >
                  Mountain Road
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. Mobile Bottom Navigation Bar */}
      <nav className="flex items-center justify-around bg-[#1e293b] border-t border-slate-700/80 px-2 py-1.5 shrink-0 z-40">
        {[
          { id: 'tracker', label: 'Tracker', icon: Music },
          { id: 'instruments', label: 'Instruments', icon: Sliders },
          { id: 'waves', label: 'Waves', icon: Activity },
          { id: 'orders', label: 'Orders', icon: ListOrdered },
          { id: 'settings', label: 'More', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = mobileTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id as any)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition active:scale-95 ${
                isActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
