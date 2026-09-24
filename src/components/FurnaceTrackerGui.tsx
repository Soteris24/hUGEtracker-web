import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Square,
  ChevronUp,
  ChevronDown,
  Copy,
  FolderOpen,
  FilePlus,
  Save,
  Volume2,
  VolumeX,
  Radio,
  FileCode,
  Sun,
  Moon,
  Plus,
  Trash2,
  Sliders,
  Waves,
  Music,
  Maximize2,
  Disc,
  HelpCircle,
} from 'lucide-react';
import {
  TSong,
  NOTE_NAMES,
  NO_NOTE,
  TCell,
  TDutyInstrument,
  TWaveInstrument,
  TNoiseInstrument,
  createEmptyPattern,
} from '../types/uge';
import { audioEngine, PlaybackState } from '../lib/audioEngine';
import { PWAInstallButton } from './PWAInstallButton';
import { EFFECT_INFO } from './EffectEditorModal';

interface FurnaceTrackerGuiProps {
  song: TSong;
  onUpdateSong: (updates: Partial<TSong>) => void;
  currentOrder: number;
  onSelectOrder: (idx: number) => void;
  onInsertOrder: (atIndex: number, clonePatterns: boolean) => void;
  onDeleteOrder: (orderIndex: number) => void;
  onMoveOrder: (orderIndex: number, direction: 'up' | 'down') => void;
  onUpdateOrderCell: (channel: number, orderIndex: number, patternIndex: number) => void;
  playbackState: PlaybackState;
  meters: [number, number, number, number];
  onPlay: (fromCursor?: boolean) => void;
  onStop: () => void;
  onPanic: () => void;
  currentOctave: number;
  onOctaveChange: (octave: number) => void;
  currentInstrument: number;
  onInstrumentChange: (inst: number) => void;
  currentStep: number;
  onStepChange: (step: number) => void;
  cursorRow: number;
  cursorChannel: number;
  cursorColumn: number;
  onCursorChange: (row: number, channel: number, column: number) => void;
  onUpdateCell: (channel: number, row: number, updates: Partial<TCell>) => void;
  onPreviewNote: (channel: number, note: number, inst: number) => void;
  onOpenEffectHelper: (channel: number, row: number) => void;
  mutedChannels: boolean[];
  soloChannels: boolean[];
  onToggleMute: (ch: number) => void;
  onToggleSolo: (ch: number) => void;
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
  onNewSong: () => void;
  onLoadUgeFile: (file: File) => void;
  onLoadSampleSong: (fileName: string) => void;
  onSaveUgeFile: () => void;
  onOpenGbdkExport: () => void;
  onSwitchGuiMode: (mode: 'modern' | 'classic' | 'furnace' | 'mobile') => void;
  onUpdateDutyInstrument: (index: number, updates: Partial<TDutyInstrument>) => void;
  onUpdateWaveInstrument: (index: number, updates: Partial<TWaveInstrument>) => void;
  onUpdateNoiseInstrument: (index: number, updates: Partial<TNoiseInstrument>) => void;
  onUpdateWave: (waveIndex: number, samples: number[]) => void;
  colorTheme?: 'dark' | 'light';
  onToggleColorTheme?: () => void;
}

const SAMPLE_SONGS = [
  'Coffee Bat - Blue Ocean.uge',
  'Coffee Bat - Wyrmhole.uge',
  'Coffee Bat - Pilgrim\'s Peril Menu.uge',
  'Arachno - A Sad Touch.uge',
  'Chavez - Monkeys on Mars.uge',
  'FADE - Microplastics in the Air.uge',
  'FADE - Strap in and Suit Up.uge',
  'Final Soldier - Stage 1 (arr. Michirin).uge',
  'Gradius - Mechanical Globule (arr. MelonadeM).uge',
  'Jester - FishNChips.uge',
  'Junichi Masuda - Pokemon Center (arr. Yomaru Kasuga).uge',
  'Junichi Masuda - Wild Pokemon Appear.uge',
  'Maktone - Softworld.uge',
  'Nordischsound - The Legend of Zelda Links Awakening Tal Tal Heights.uge',
  'PotatoTeto - A pleasant breeze.uge',
  'Reed - Funkabeer\'s Revenge.uge',
  'Skrju - Normal Life.uge',
  'Trash80 - Missing You.uge',
  'devEd - Blippie.uge',
  'parall4x - broken.uge',
];

const KEY_TO_SEMITONE: Record<string, number> = {
  z: 0, s: 1, x: 2, d: 3, c: 4, v: 5, g: 6, b: 7, h: 8, n: 9, j: 10, m: 11, ',': 12,
  q: 12, '2': 13, w: 14, '3': 15, e: 16, r: 17, '5': 18, t: 19, '6': 20, y: 21, '7': 22, u: 23, i: 24,
};

export const FurnaceTrackerGui: React.FC<FurnaceTrackerGuiProps> = ({
  song,
  onUpdateSong,
  currentOrder,
  onSelectOrder,
  onInsertOrder,
  onDeleteOrder,
  onMoveOrder,
  onUpdateOrderCell,
  playbackState,
  meters,
  onPlay,
  onStop,
  onPanic,
  currentOctave,
  onOctaveChange,
  currentInstrument,
  onInstrumentChange,
  currentStep,
  onStepChange,
  cursorRow,
  cursorChannel,
  cursorColumn,
  onCursorChange,
  onUpdateCell,
  onPreviewNote,
  onOpenEffectHelper,
  mutedChannels,
  soloChannels,
  onToggleMute,
  onToggleSolo,
  masterVolume,
  onMasterVolumeChange,
  onNewSong,
  onLoadUgeFile,
  onLoadSampleSong,
  onSaveUgeFile,
  onOpenGbdkExport,
  onSwitchGuiMode,
  onUpdateDutyInstrument,
  onUpdateWaveInstrument,
  onUpdateNoiseInstrument,
  onUpdateWave,
  colorTheme = 'dark',
  onToggleColorTheme,
}) => {
  const isLight = colorTheme === 'light';

  // Furnace Active Dock Tab: 'instrument' | 'wave' | 'song'
  const [activeBottomTab, setActiveBottomTab] = useState<'instrument' | 'wave' | 'song'>('instrument');

  // Selected Instrument in Furnace Dock
  const [instBankType, setInstBankType] = useState<0 | 1 | 2>(0); // 0=Duty, 1=Wave, 2=Noise
  const [selectedInstIndex, setSelectedInstIndex] = useState<number>(0);

  // Selected Wave in Furnace Wavetable Editor
  const [selectedWaveIndex, setSelectedWaveIndex] = useState<number>(0);
  const [isDrawingWave, setIsDrawingWave] = useState<boolean>(false);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // File picker ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Grid container ref for auto-scrolling
  const gridContainerRef = useRef<HTMLDivElement | null>(null);

  // Oscilloscope canvas refs
  const oscCanvasesRef = useRef<(HTMLCanvasElement | null)[]>([]);

  // Menu dropdown state
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Edit / Record Mode
  const [isRecordMode, setIsRecordMode] = useState<boolean>(true);

  // About modal
  const [aboutModalOpen, setAboutModalOpen] = useState<boolean>(false);

  // Active playing row vs cursor row
  const activeRow = playbackState.isPlaying ? playbackState.row : cursorRow;

  // Auto-scroll grid to follow playback or cursor
  useEffect(() => {
    if (gridContainerRef.current) {
      const rowElem = gridContainerRef.current.querySelector(`[data-row="${activeRow}"]`);
      if (rowElem) {
        rowElem.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      }
    }
  }, [activeRow]);

  // Furnace Real-time Oscilloscope animation
  useEffect(() => {
    let animId: number;
    const drawScopes = () => {
      oscCanvasesRef.current.forEach((canvas, ch) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const width = canvas.width;
        const height = canvas.height;

        // Furnace Oscilloscope background
        ctx.fillStyle = isLight ? '#1a202c' : '#0e1117';
        ctx.fillRect(0, 0, width, height);

        // Center line
        ctx.strokeStyle = isLight ? '#2d3748' : '#1e2533';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        const meter = meters[ch] || 0;
        const hasSolo = soloChannels.some(Boolean);
        const isAudible = hasSolo ? (soloChannels[ch] && !mutedChannels[ch]) : !mutedChannels[ch];
        const apu = audioEngine.apu;
        const chSound = apu ? apu.snd[ch] : null;
        const isSoundActive = isAudible && ((playbackState.isPlaying && meter > 0.015) || (chSound?.enable && chSound.vol > 0));

        // Channel colors matching Furnace theme
        const colors = isLight
          ? ['#0284c7', '#16a34a', '#d97706', '#9333ea']
          : ['#38bdf8', '#4ade80', '#facc15', '#c084fc'];

        if (isSoundActive && apu) {
          ctx.strokeStyle = colors[ch];
          ctx.lineWidth = 1.75;
          ctx.beginPath();

          const amp = Math.min(1, Math.max(0.25, ((chSound?.vol || 12) / 15) * 0.85 + meter * 0.35)) * (height * 0.42);

          if (ch === 0 || ch === 1) {
            // Pulse 1 & Pulse 2: Actual Game Boy Hardware Duty Cycle (Stationary & Centered)
            const regIdx = ch === 0 ? 1 : 6;
            const dutyBits = (apu.regs[regIdx] >> 6) & 3;
            const dutyRatios = [0.125, 0.25, 0.50, 0.75];
            const dutyRatio = dutyRatios[dutyBits] ?? 0.5;

            const numPeriods = 3;
            let prevHigh: boolean | null = null;
            for (let x = 0; x < width; x++) {
              const normX = x / width;
              const cyclePhase = (normX * numPeriods) % 1;
              const isHigh = cyclePhase >= (1 - dutyRatio) / 2 && cyclePhase < (1 + dutyRatio) / 2;
              const y = height / 2 + (isHigh ? -amp : amp);

              if (x === 0) {
                ctx.moveTo(x, y);
              } else {
                if (prevHigh !== null && prevHigh !== isHigh) {
                  const prevY = height / 2 + (prevHigh ? -amp : amp);
                  ctx.lineTo(x, prevY);
                  ctx.lineTo(x, y);
                } else {
                  ctx.lineTo(x, y);
                }
              }
              prevHigh = isHigh;
            }
            ctx.stroke();

          } else if (ch === 2) {
            // Wave Synthesizer: Actual 32 4-bit Samples from APU Wave RAM (Stationary & Centered)
            const waveSamples: number[] = [];
            let hasSamples = false;
            for (let b = 0; b < 16; b++) {
              const byte = apu.regs[0x20 + b] || 0;
              const hi = (byte >> 4) & 0x0f;
              const lo = byte & 0x0f;
              waveSamples.push(hi, lo);
              if (hi > 0 || lo > 0) hasSamples = true;
            }
            const activeSamples = hasSamples ? waveSamples : (song.waves[selectedWaveIndex] || Array(32).fill(8));

            const numPeriods = 2;
            let prevSampleIdx = -1;
            for (let x = 0; x < width; x++) {
              const normX = x / width;
              const cyclePhase = (normX * numPeriods) % 1;
              const sampleIdx = Math.floor(cyclePhase * 32);
              const sampleVal = activeSamples[sampleIdx] ?? 8;
              const normVal = (sampleVal - 7.5) / 7.5;
              const y = height / 2 - normVal * amp;

              if (x === 0) {
                ctx.moveTo(x, y);
              } else {
                if (prevSampleIdx !== -1 && prevSampleIdx !== sampleIdx) {
                  const prevVal = (activeSamples[prevSampleIdx] - 7.5) / 7.5;
                  const prevY = height / 2 - prevVal * amp;
                  ctx.lineTo(x, prevY);
                  ctx.lineTo(x, y);
                } else {
                  ctx.lineTo(x, y);
                }
              }
              prevSampleIdx = sampleIdx;
            }
            ctx.stroke();

          } else {
            // Noise: Authentic Pseudo-Random Noise from LFSR (Stationary & Centered)
            const is7bit = ((apu.regs[0x12] || 0) & 0x08) !== 0;

            let prevNoiseBit: number | null = null;
            for (let x = 0; x < width; x++) {
              const step = Math.floor((x / width) * 48);
              const noiseBit = (step % 2 === 0 ? 1 : -1) * (Math.sin(step * 12.9898 + (is7bit ? 7 : 15)) > 0 ? 1 : -1);
              const y = height / 2 + noiseBit * amp * 0.9;

              if (x === 0) {
                ctx.moveTo(x, y);
              } else {
                if (prevNoiseBit !== null && prevNoiseBit !== noiseBit) {
                  const prevY = height / 2 + prevNoiseBit * amp * 0.9;
                  ctx.lineTo(x, prevY);
                  ctx.lineTo(x, y);
                } else {
                  ctx.lineTo(x, y);
                }
              }
              prevNoiseBit = noiseBit;
            }
            ctx.stroke();
          }

        } else {
          // Idle line
          ctx.strokeStyle = isLight ? '#4a5568' : '#2d3748';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, height / 2);
          ctx.lineTo(width, height / 2);
          ctx.stroke();
        }
      });
      animId = requestAnimationFrame(drawScopes);
    };
    animId = requestAnimationFrame(drawScopes);
    return () => cancelAnimationFrame(animId);
  }, [meters, playbackState.isPlaying, mutedChannels, soloChannels, isLight]);

  // Waveform canvas rendering
  const currentWaveSamples = song.waves[selectedWaveIndex] || Array(32).fill(0);

  const drawWaveCanvas = useCallback(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = isLight ? '#ffffff' : '#14161d';
    ctx.fillRect(0, 0, w, h);

    // Horizontal level lines (0..15)
    ctx.strokeStyle = isLight ? '#e2e8f0' : '#222734';
    ctx.lineWidth = 1;
    for (let lvl = 0; lvl <= 15; lvl++) {
      const y = h - (lvl / 15) * (h - 20) - 10;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Vertical sample bars (32 steps)
    const barWidth = (w - 20) / 32;
    for (let s = 0; s < 32; s++) {
      const val = currentWaveSamples[s] || 0;
      const barHeight = (val / 15) * (h - 24);
      const x = 10 + s * barWidth;
      const y = h - 12 - barHeight;

      // Furnace bar color
      ctx.fillStyle = isLight ? '#0284c7' : '#38bdf8';
      ctx.fillRect(x + 1, y, Math.max(1, barWidth - 2), barHeight);

      ctx.fillStyle = isLight ? '#bae6fd' : '#7dd3fc';
      ctx.fillRect(x + 1, y, Math.max(1, barWidth - 2), 2);
    }
  }, [currentWaveSamples, isLight]);

  useEffect(() => {
    drawWaveCanvas();
  }, [drawWaveCanvas]);

  const handleWaveCanvasPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const barWidth = (canvas.width - 20) / 32;
    const sampleIdx = Math.floor((clientX - 10) / barWidth);

    if (sampleIdx >= 0 && sampleIdx < 32) {
      const normY = 1 - Math.max(0, Math.min(1, (clientY - 10) / (canvas.height - 20)));
      const nibbleVal = Math.round(normY * 15);
      const next = [...currentWaveSamples];
      next[sampleIdx] = nibbleVal;
      onUpdateWave(selectedWaveIndex, next);
    }
  };

  // Keyboard navigation & note entry
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Space: Play / Stop
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (playbackState.isPlaying) onStop();
      else onPlay(true);
      return;
    }

    // F5: Play from start
    if (e.key === 'F5') {
      e.preventDefault();
      onPlay(false);
      return;
    }

    // F6: Play from cursor
    if (e.key === 'F6') {
      e.preventDefault();
      onPlay(true);
      return;
    }

    // F8: Stop
    if (e.key === 'F8') {
      e.preventDefault();
      onStop();
      return;
    }

    // Arrow keys
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onCursorChange(Math.max(0, cursorRow - 1), cursorChannel, cursorColumn);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onCursorChange(Math.min(63, cursorRow + 1), cursorChannel, cursorColumn);
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (cursorColumn > 0) {
        onCursorChange(cursorRow, cursorChannel, cursorColumn - 1);
      } else if (cursorChannel > 0) {
        onCursorChange(cursorRow, cursorChannel - 1, 4);
      }
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (cursorColumn < 4) {
        onCursorChange(cursorRow, cursorChannel, cursorColumn + 1);
      } else if (cursorChannel < 3) {
        onCursorChange(cursorRow, cursorChannel + 1, 0);
      }
      return;
    }

    // Page Up / Page Down (Jump 16 rows)
    if (e.key === 'PageUp') {
      e.preventDefault();
      onCursorChange(Math.max(0, cursorRow - 16), cursorChannel, cursorColumn);
      return;
    }
    if (e.key === 'PageDown') {
      e.preventDefault();
      onCursorChange(Math.min(63, cursorRow + 16), cursorChannel, cursorColumn);
      return;
    }

    // Delete / Backspace: Clear cell component
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (cursorColumn === 0) onUpdateCell(cursorChannel, cursorRow, { note: NO_NOTE });
      else if (cursorColumn === 1) onUpdateCell(cursorChannel, cursorRow, { instrument: 0 });
      else if (cursorColumn === 2) onUpdateCell(cursorChannel, cursorRow, { volume: 0 });
      else if (cursorColumn === 3) onUpdateCell(cursorChannel, cursorRow, { effectCode: 0 });
      else if (cursorColumn === 4) onUpdateCell(cursorChannel, cursorRow, { effectParams: 0 });
      return;
    }

    // Note cut: Backquote or '=' key
    if (e.key === '`' || e.key === '=') {
      e.preventDefault();
      onUpdateCell(cursorChannel, cursorRow, { effectCode: 0x0e, effectParams: 0 });
      if (currentStep > 0) {
        onCursorChange(Math.min(63, cursorRow + currentStep), cursorChannel, cursorColumn);
      }
      return;
    }

    // Note entry via ModPlug keyboard layout
    const keyLower = e.key.toLowerCase();
    if (cursorColumn === 0 && KEY_TO_SEMITONE[keyLower] !== undefined) {
      e.preventDefault();
      const semitone = KEY_TO_SEMITONE[keyLower];
      const baseNote = (currentOctave - 3) * 12;
      const targetNote = baseNote + semitone;

      if (targetNote >= 0 && targetNote < 72) {
        onUpdateCell(cursorChannel, cursorRow, {
          note: targetNote,
          instrument: currentInstrument,
        });
        onPreviewNote(cursorChannel, targetNote, currentInstrument);
        if (currentStep > 0) {
          onCursorChange(Math.min(63, cursorRow + currentStep), cursorChannel, cursorColumn);
        }
      }
      return;
    }

    // Instrument Column Hex Entry (0..F)
    if (cursorColumn === 1 && /^[0-9a-fA-F]$/.test(e.key)) {
      e.preventDefault();
      const hexVal = parseInt(e.key, 16);
      onUpdateCell(cursorChannel, cursorRow, { instrument: hexVal });
      if (currentStep > 0) {
        onCursorChange(Math.min(63, cursorRow + currentStep), cursorChannel, cursorColumn);
      }
      return;
    }

    // Volume Column Hex Entry (0..F)
    if (cursorColumn === 2 && /^[0-9a-fA-F]$/.test(e.key)) {
      e.preventDefault();
      const hexVal = parseInt(e.key, 16);
      onUpdateCell(cursorChannel, cursorRow, { volume: hexVal });
      if (currentStep > 0) {
        onCursorChange(Math.min(63, cursorRow + currentStep), cursorChannel, cursorColumn);
      }
      return;
    }

    // Effect Code Column Entry (0..F)
    if (cursorColumn === 3 && /^[0-9a-fA-F]$/.test(e.key)) {
      e.preventDefault();
      const code = parseInt(e.key, 16);
      onUpdateCell(cursorChannel, cursorRow, { effectCode: code });
      onCursorChange(cursorRow, cursorChannel, 4);
      return;
    }

    // Effect Param Column Entry (Hex 0..F)
    if (cursorColumn === 4 && /^[0-9a-fA-F]$/.test(e.key)) {
      e.preventDefault();
      const nibble = parseInt(e.key, 16);
      const currentPat = song.orderMatrix[cursorChannel]?.[currentOrder] ?? 0;
      const cell = song.patterns[currentPat]?.[cursorRow];
      const curParam = cell?.effectParams ?? 0;
      const newParam = ((curParam & 0x0f) << 4) | nibble;
      onUpdateCell(cursorChannel, cursorRow, { effectParams: newParam });
      if (currentStep > 0) {
        onCursorChange(Math.min(63, cursorRow + currentStep), cursorChannel, 0);
      }
      return;
    }
  };

  // Active instrument object in dock
  const dutyInst = song.dutyInstruments[selectedInstIndex] || {
    type: 0,
    name: 'Blank',
    length: 0,
    lengthEnabled: false,
    initialVolume: 15,
    volSweepDirection: 1,
    volSweepAmount: 3,
    sweepTime: 0,
    sweepIncDec: 0,
    sweepShift: 0,
    duty: 2,
    subpatternEnabled: false,
    subpattern: createEmptyPattern(),
  };

  const waveInst = song.waveInstruments[selectedInstIndex] || {
    type: 1,
    name: 'Blank',
    length: 0,
    lengthEnabled: false,
    outputLevel: 1,
    waveform: 0,
    subpatternEnabled: false,
    subpattern: createEmptyPattern(),
  };

  const noiseInst = song.noiseInstruments[selectedInstIndex] || {
    type: 2,
    name: 'Blank',
    length: 0,
    lengthEnabled: false,
    initialVolume: 15,
    volSweepDirection: 1,
    volSweepAmount: 3,
    counterStep: 0,
    noiseMacro: [0, 0, 0, 0, 0, 0],
    subpatternEnabled: false,
    subpattern: createEmptyPattern(),
  };

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenu(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Theme styles
  const themeBg = isLight ? 'bg-[#e5e7eb] text-[#1f2937]' : 'bg-[#12141c] text-[#e2e8f0]';
  const dockBg = isLight ? 'bg-[#f3f4f6] border-[#d1d5db]' : 'bg-[#181a24] border-[#262938]';
  const panelHeaderBg = isLight ? 'bg-[#e5e7eb] border-[#d1d5db] text-[#374151]' : 'bg-[#1e2230] border-[#2b3042] text-[#94a3b8]';
  const menuBarBg = isLight ? 'bg-[#f9fafb] border-[#e5e7eb]' : 'bg-[#151722] border-[#222636]';
  const buttonBg = isLight ? 'bg-[#ffffff] hover:bg-[#f3f4f6] text-[#1f2937] border-[#d1d5db]' : 'bg-[#212534] hover:bg-[#2b3145] text-[#f1f5f9] border-[#333a52]';
  const activeBtnBg = isLight ? 'bg-[#0284c7] text-white border-[#0369a1]' : 'bg-[#0284c7] text-white border-[#38bdf8]';
  const gridRowAlt = isLight ? 'bg-[#ffffff]' : 'bg-[#141620]';
  const gridRowBeat = isLight ? 'bg-[#f1f5f9]' : 'bg-[#191c28]';
  const gridRowMajor = isLight ? 'bg-[#e2e8f0]' : 'bg-[#212638]';
  const gridCursorRow = isLight ? 'bg-[#bae6fd] text-[#0369a1]' : 'bg-[#1e3a5f] text-[#38bdf8]';

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden font-mono select-none ${themeBg}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept=".uge"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onLoadUgeFile(file);
        }}
      />

      {/* ========================================================================= */}
      {/* 1. FURNACE TOP MENU BAR                                                  */}
      {/* ========================================================================= */}
      <div className={`flex items-center justify-between px-2 py-1 text-xs border-b ${menuBarBg} shrink-0 z-40`}>
        {/* Left: Furnace Menus */}
        <div className="flex items-center gap-1 relative" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 mr-2">
            <span className="tracking-wider">FURNACE</span>
            <span className="text-[10px] text-amber-400/80 font-normal">v0.6 (DMG)</span>
          </div>

          {/* File Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
              className={`px-2 py-0.5 rounded hover:bg-slate-700/20 ${activeMenu === 'file' ? 'bg-slate-700/30' : ''}`}
            >
              File
            </button>
            {activeMenu === 'file' && (
              <div className={`absolute top-full left-0 mt-1 w-48 shadow-2xl rounded border py-1 z-50 text-xs ${dockBg}`}>
                <button
                  onClick={() => {
                    onNewSong();
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-blue-600 hover:text-white flex items-center gap-2"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>New Song (Ctrl+N)</span>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-blue-600 hover:text-white flex items-center gap-2"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Open .uge (Ctrl+O)</span>
                </button>
                <button
                  onClick={() => {
                    onSaveUgeFile();
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-blue-600 hover:text-white flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save .uge (Ctrl+S)</span>
                </button>
                <div className={`border-t my-1 ${isLight ? 'border-gray-300' : 'border-slate-700'}`} />
                <button
                  onClick={() => {
                    onOpenGbdkExport();
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-blue-600 hover:text-white flex items-center gap-2 text-emerald-500 font-bold"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Export to GBDK C</span>
                </button>
              </div>
            )}
          </div>

          {/* Demos Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === 'demos' ? null : 'demos')}
              className={`px-2 py-0.5 rounded hover:bg-slate-700/20 ${activeMenu === 'demos' ? 'bg-slate-700/30' : ''}`}
            >
              Demos
            </button>
            {activeMenu === 'demos' && (
              <div className={`absolute top-full left-0 mt-1 w-64 max-h-80 overflow-y-auto shadow-2xl rounded border py-1 z-50 text-xs ${dockBg}`}>
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-700/50">
                  Game Boy Chiptune Songs
                </div>
                {SAMPLE_SONGS.map((songName) => (
                  <button
                    key={songName}
                    onClick={() => {
                      onLoadSampleSong(songName);
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-3 py-1 hover:bg-blue-600 hover:text-white truncate"
                  >
                    {songName.replace('.uge', '')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* UI Mode Switcher Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === 'mode' ? null : 'mode')}
              className={`px-2 py-0.5 rounded hover:bg-slate-700/20 font-bold text-cyan-400 ${activeMenu === 'mode' ? 'bg-slate-700/30' : ''}`}
            >
              UI Mode: Furnace ▾
            </button>
            {activeMenu === 'mode' && (
              <div className={`absolute top-full left-0 mt-1 w-52 shadow-2xl rounded border py-1 z-50 text-xs ${dockBg}`}>
                <button
                  onClick={() => {
                    onSwitchGuiMode('modern');
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between"
                >
                  <span>1. Modern Studio UI</span>
                </button>
                <button
                  onClick={() => {
                    onSwitchGuiMode('classic');
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between"
                >
                  <span>2. hUGETracker 1:1 Desktop</span>
                </button>
                <button
                  onClick={() => {
                    onSwitchGuiMode('furnace');
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 bg-blue-600 text-white font-bold flex items-center justify-between"
                >
                  <span>3. Furnace Tracker GUI</span>
                  <span>✓</span>
                </button>
                <button
                  onClick={() => {
                    onSwitchGuiMode('mobile');
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between text-emerald-400"
                >
                  <span>4. Mobile Touch DAW</span>
                </button>
              </div>
            )}
          </div>

          {/* View Menu (Color Theme) */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
              className={`px-2 py-0.5 rounded hover:bg-slate-700/20 ${activeMenu === 'view' ? 'bg-slate-700/30' : ''}`}
            >
              View
            </button>
            {activeMenu === 'view' && (
              <div className={`absolute top-full left-0 mt-1 w-48 shadow-2xl rounded border py-1 z-50 text-xs ${dockBg}`}>
                <button
                  onClick={() => {
                    if (onToggleColorTheme && !isLight) onToggleColorTheme();
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${isLight ? 'bg-blue-600 text-white font-bold' : 'hover:bg-blue-600 hover:text-white'}`}
                >
                  <span className="flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5" /> Light Scheme
                  </span>
                  {isLight && <span>✓</span>}
                </button>
                <button
                  onClick={() => {
                    if (onToggleColorTheme && isLight) onToggleColorTheme();
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${!isLight ? 'bg-blue-600 text-white font-bold' : 'hover:bg-blue-600 hover:text-white'}`}
                >
                  <span className="flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5" /> Dark Scheme
                  </span>
                  {!isLight && <span>✓</span>}
                </button>
              </div>
            )}
          </div>

          {/* Help Menu */}
          <button
            onClick={() => setAboutModalOpen(true)}
            className="px-2 py-0.5 rounded hover:bg-slate-700/20"
          >
            Help
          </button>
        </div>

        {/* Right: Chip Info Badge & Quick Switchers */}
        <div className="flex items-center gap-2">
          {/* Direct 3-UI Switcher Buttons */}
          <div className="hidden sm:flex items-center rounded border border-slate-700 p-0.5 bg-slate-900/60 text-[10px]">
            <button
              onClick={() => onSwitchGuiMode('modern')}
              className="px-2 py-0.5 rounded text-slate-400 hover:text-white"
              title="Switch to Modern Studio UI"
            >
              Modern
            </button>
            <button
              onClick={() => onSwitchGuiMode('classic')}
              className="px-2 py-0.5 rounded text-slate-400 hover:text-white"
              title="Switch to hUGETracker 1:1 Desktop UI"
            >
              hUGE 1:1
            </button>
            <button
              onClick={() => onSwitchGuiMode('furnace')}
              className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold"
              title="Currently on Furnace Tracker UI"
            >
              Furnace
            </button>
          </div>

          {/* Theme Quick Toggle */}
          <button
            onClick={onToggleColorTheme}
            className={`p-1 rounded border ${buttonBg}`}
            title={isLight ? 'Switch to Dark Scheme' : 'Switch to Light Scheme'}
          >
            {isLight ? <Moon className="w-3.5 h-3.5 text-blue-600" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
          </button>

          {/* Chip Specs */}
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-cyan-400 hidden md:inline-block">
            Nintendo Game Boy (DMG-01) · 4.194304 MHz
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FURNACE TRANSPORT BAR & 4-CHANNEL OSCILLOSCOPES                       */}
      {/* ========================================================================= */}
      <div className={`flex flex-wrap items-center justify-between px-3 py-1.5 border-b gap-3 ${dockBg} shrink-0`}>
        {/* Left: Transport Controls */}
        <div className="flex items-center gap-1.5">
          {/* Rewind */}
          <button
            onClick={() => onCursorChange(0, cursorChannel, cursorColumn)}
            className={`px-2 py-1.5 rounded border text-xs ${buttonBg}`}
            title="Rewind to Row 0"
          >
            ⏮
          </button>

          {/* Step Back */}
          <button
            onClick={() => onCursorChange(Math.max(0, cursorRow - 1), cursorChannel, cursorColumn)}
            className={`px-2 py-1.5 rounded border text-xs ${buttonBg}`}
            title="Step Back One Row"
          >
            ◀
          </button>

          {/* Play / Stop */}
          <button
            onClick={() => onPlay(false)}
            className={`px-3 py-1.5 rounded border text-xs font-bold flex items-center gap-1 shadow-xs ${
              playbackState.isPlaying ? 'bg-emerald-700 text-white border-emerald-500' : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
            }`}
            title="Play Song from Start (F5)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>PLAY</span>
          </button>

          <button
            onClick={() => onPlay(true)}
            className={`px-2 py-1.5 rounded border text-xs font-bold ${buttonBg}`}
            title="Play from Cursor Row (F6)"
          >
            ▶| Row
          </button>

          <button
            onClick={onStop}
            className={`px-3 py-1.5 rounded border text-xs font-bold flex items-center gap-1 ${
              !playbackState.isPlaying ? 'bg-rose-900/60 text-rose-300 border-rose-800' : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400'
            }`}
            title="Stop Playback (F8)"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>STOP</span>
          </button>

          {/* Record / Edit Toggle */}
          <button
            onClick={() => setIsRecordMode(!isRecordMode)}
            className={`px-2.5 py-1.5 rounded border text-xs font-bold flex items-center gap-1 ${
              isRecordMode ? 'bg-red-600 text-white border-red-400' : buttonBg
            }`}
            title="Toggle Edit / Record Mode (Space)"
          >
            <span className="w-2 h-2 rounded-full bg-current inline-block" />
            <span>REC</span>
          </button>

          {/* Panic */}
          <button
            onClick={onPanic}
            className="px-2 py-1.5 rounded border border-red-800/80 bg-red-950/40 text-red-400 hover:bg-red-900 hover:text-white text-xs font-bold"
            title="Kill all sound generators"
          >
            PANIC
          </button>
        </div>

        {/* Center: Furnace Master LED Counters */}
        <div className="flex items-center gap-2">
          {/* Time & Position Display */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0a0c12] border border-[#222736] text-xs font-mono">
            <span className="text-slate-400 text-[10px]">TIME:</span>
            <span className="text-emerald-400 font-bold">
              {playbackState.isPlaying
                ? `${Math.floor((playbackState.orderIndex * 64 + playbackState.row) / 60)
                    .toString()
                    .padStart(2, '0')}:${Math.floor(((playbackState.orderIndex * 64 + playbackState.row) % 60) * 1.6)
                    .toString()
                    .padStart(2, '0')}.00`
                : '00:00.00'}
            </span>

            <span className="text-slate-600">|</span>

            <span className="text-slate-400 text-[10px]">ORD:</span>
            <span className="text-amber-400 font-bold">
              {(currentOrder + 1).toString().padStart(2, '0')}/{(song.orderMatrix[0]?.length || 1).toString().padStart(2, '0')}
            </span>

            <span className="text-slate-600">|</span>

            <span className="text-slate-400 text-[10px]">ROW:</span>
            <span className="text-cyan-400 font-bold">{activeRow.toString(16).toUpperCase().padStart(2, '0')}/3F</span>

            <span className="text-slate-600">|</span>

            <span className="text-slate-400 text-[10px]">SPD:</span>
            <span className="text-purple-400 font-bold">{song.ticksPerRow || 6}</span>
          </div>

          {/* Octave & Step Steppers */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 text-xs bg-slate-800/60 border border-slate-700 rounded px-1.5 py-1">
              <span className="text-slate-400 text-[10px]">OCT:</span>
              <span className="font-bold text-white px-1">{currentOctave}</span>
              <button
                onClick={() => onOctaveChange(Math.max(3, currentOctave - 1))}
                className="px-1 hover:text-cyan-400"
              >
                -
              </button>
              <button
                onClick={() => onOctaveChange(Math.min(8, currentOctave + 1))}
                className="px-1 hover:text-cyan-400"
              >
                +
              </button>
            </div>

            <div className="flex items-center gap-0.5 text-xs bg-slate-800/60 border border-slate-700 rounded px-1.5 py-1">
              <span className="text-slate-400 text-[10px]">STEP:</span>
              <span className="font-bold text-white px-1">{currentStep}</span>
              <button
                onClick={() => onStepChange(Math.max(0, currentStep - 1))}
                className="px-1 hover:text-cyan-400"
              >
                -
              </button>
              <button
                onClick={() => onStepChange(Math.min(16, currentStep + 1))}
                className="px-1 hover:text-cyan-400"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Right: 4-Channel Furnace Oscilloscopes */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['CH1: Pulse 1', 'CH2: Pulse 2', 'CH3: Wave', 'CH4: Noise'].map((label, ch) => {
            const isMuted = mutedChannels[ch];
            const isSolo = soloChannels[ch];
            return (
              <div
                key={ch}
                className={`flex flex-col rounded border p-1 ${isLight ? 'bg-slate-200 border-slate-300' : 'bg-[#141620] border-[#222736]'}`}
              >
                <div className="flex items-center justify-between text-[9px] font-bold px-0.5 mb-0.5 gap-1">
                  <span className="truncate max-w-[70px]">{label}</span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => onToggleMute(ch)}
                      className={`px-1 rounded text-[8px] ${
                        isMuted ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                      title={`Mute ${label}`}
                    >
                      M
                    </button>
                    <button
                      onClick={() => onToggleSolo(ch)}
                      className={`px-1 rounded text-[8px] ${
                        isSolo ? 'bg-amber-500 text-black font-bold' : 'bg-slate-700 text-slate-300'
                      }`}
                      title={`Solo ${label}`}
                    >
                      S
                    </button>
                  </div>
                </div>
                <canvas
                  ref={(el) => {
                    oscCanvasesRef.current[ch] = el;
                  }}
                  width={110}
                  height={26}
                  className="rounded border border-black/40"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE (LEFT DOCK: ORDERS & INSTS / RIGHT: PATTERN EDITOR)    */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT DOCK: Furnace Orders & Instrument Quick Pick */}
        <div className={`w-64 flex flex-col border-r ${dockBg} shrink-0`}>
          {/* Orders Section Header */}
          <div className={`px-2 py-1.5 text-xs font-bold flex items-center justify-between border-b ${panelHeaderBg}`}>
            <div className="flex items-center gap-1.5">
              <span>ORDERS</span>
              <span className="text-[10px] text-slate-400">({song.orderMatrix[0]?.length || 0})</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onInsertOrder(currentOrder + 1, false)}
                className={`p-1 rounded border ${buttonBg}`}
                title="Insert New Order"
              >
                <Plus className="w-3 h-3 text-emerald-400" />
              </button>
              <button
                onClick={() => onInsertOrder(currentOrder + 1, true)}
                className={`p-1 rounded border ${buttonBg}`}
                title="Clone Current Order"
              >
                <Copy className="w-3 h-3 text-cyan-400" />
              </button>
              <button
                onClick={() => onDeleteOrder(currentOrder)}
                disabled={(song.orderMatrix[0]?.length || 1) <= 1}
                className={`p-1 rounded border disabled:opacity-30 ${buttonBg}`}
                title="Delete Order"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="h-44 overflow-y-auto divide-y border-b divide-slate-700/40 text-[11px]">
            <div className="grid grid-cols-5 px-2 py-1 text-[10px] font-bold bg-black/20 text-slate-400 sticky top-0 z-10 border-b border-slate-700/50">
              <span>#</span>
              <span>P1</span>
              <span>P2</span>
              <span>W3</span>
              <span>N4</span>
            </div>
            {Array.from({ length: song.orderMatrix[0]?.length || 1 }, (_, ordIdx) => {
              const isSelected = ordIdx === currentOrder;
              const isPlayingOrder = ordIdx === playbackState.orderIndex && playbackState.isPlaying;
              return (
                <div
                  key={ordIdx}
                  onClick={() => onSelectOrder(ordIdx)}
                  className={`grid grid-cols-5 px-2 py-1 cursor-pointer items-center ${
                    isPlayingOrder
                      ? 'bg-emerald-600 text-white font-bold'
                      : isSelected
                      ? isLight
                        ? 'bg-blue-200 text-blue-900 font-bold'
                        : 'bg-blue-600/30 text-blue-300 font-bold border-l-2 border-blue-500'
                      : 'hover:bg-slate-700/20'
                  }`}
                >
                  <span className="font-bold opacity-80">{ordIdx.toString(16).toUpperCase().padStart(2, '0')}</span>
                  {[0, 1, 2, 3].map((ch) => (
                    <span key={ch} className="font-mono">
                      {song.orderMatrix[ch]?.[ordIdx] ?? 0}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Instruments Dock Header */}
          <div className={`px-2 py-1.5 text-xs font-bold flex items-center justify-between border-b ${panelHeaderBg}`}>
            <span>INSTRUMENTS (15/15)</span>
            <div className="flex rounded border border-slate-700 overflow-hidden text-[10px]">
              <button
                onClick={() => setInstBankType(0)}
                className={`px-1.5 py-0.5 ${instBankType === 0 ? 'bg-cyan-600 text-white' : 'hover:bg-slate-700'}`}
              >
                Duty
              </button>
              <button
                onClick={() => setInstBankType(1)}
                className={`px-1.5 py-0.5 ${instBankType === 1 ? 'bg-yellow-600 text-white' : 'hover:bg-slate-700'}`}
              >
                Wave
              </button>
              <button
                onClick={() => setInstBankType(2)}
                className={`px-1.5 py-0.5 ${instBankType === 2 ? 'bg-purple-600 text-white' : 'hover:bg-slate-700'}`}
              >
                Noise
              </button>
            </div>
          </div>

          {/* Instruments List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-700/30 text-xs">
            {Array.from({ length: 15 }, (_, i) => {
              const inst =
                instBankType === 0
                  ? song.dutyInstruments[i]
                  : instBankType === 1
                  ? song.waveInstruments[i]
                  : song.noiseInstruments[i];
              const isSelected = selectedInstIndex === i;
              return (
                <div
                  key={i}
                  onClick={() => {
                    setSelectedInstIndex(i);
                    onInstrumentChange(i + 1);
                  }}
                  className={`px-2.5 py-1.5 flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? isLight
                        ? 'bg-blue-100 text-blue-900 font-bold border-l-2 border-blue-600'
                        : 'bg-blue-950/60 text-cyan-300 font-bold border-l-2 border-cyan-400'
                      : 'hover:bg-slate-700/20'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-slate-400 text-[10px]">{(i + 1).toString().padStart(2, '0')}</span>
                    <span className="truncate">{inst?.name || `Inst ${i + 1}`}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const ch = instBankType === 0 ? 0 : instBankType === 1 ? 2 : 3;
                      onPreviewNote(ch, 24, i + 1);
                    }}
                    className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white text-[10px]"
                    title="Audition Instrument"
                  >
                    ▶
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER / RIGHT: FURNACE PATTERN EDITOR */}
        <div className="flex-1 flex flex-col overflow-hidden bg-black/10">
          {/* Channel Headers Strip */}
          <div className={`grid grid-cols-4 border-b ${panelHeaderBg} text-xs font-bold shrink-0 ml-12`}>
            {['0: Pulse 1', '1: Pulse 2', '2: Wave', '3: Noise'].map((label, ch) => {
              const patIdx = song.orderMatrix[ch]?.[currentOrder] ?? 0;
              const isMuted = mutedChannels[ch];
              const isSolo = soloChannels[ch];
              const colColors = isLight
                ? ['text-sky-700', 'text-emerald-700', 'text-amber-700', 'text-purple-700']
                : ['text-sky-400', 'text-emerald-400', 'text-amber-400', 'text-purple-400'];
              return (
                <div
                  key={ch}
                  className={`px-3 py-1.5 border-r border-slate-700/50 flex items-center justify-between ${
                    cursorChannel === ch ? (isLight ? 'bg-sky-100/60' : 'bg-sky-950/30') : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`font-bold ${colColors[ch]}`}>{label}</span>
                    <span className="text-[10px] text-slate-400 font-mono">P{patIdx}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggleMute(ch)}
                      className={`px-1 py-0.2 rounded text-[9px] ${
                        isMuted ? 'bg-rose-600 text-white' : 'bg-slate-700/60 text-slate-300'
                      }`}
                    >
                      M
                    </button>
                    <button
                      onClick={() => onToggleSolo(ch)}
                      className={`px-1 py-0.2 rounded text-[9px] ${
                        isSolo ? 'bg-amber-500 text-black font-bold' : 'bg-slate-700/60 text-slate-300'
                      }`}
                    >
                      S
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pattern Rows Matrix */}
          <div
            ref={gridContainerRef}
            className="flex-1 overflow-y-auto text-xs font-mono focus:outline-none"
            tabIndex={0}
          >
            {Array.from({ length: 64 }, (_, rowIdx) => {
              const isCurrentPlayingRow = rowIdx === playbackState.row && playbackState.isPlaying;
              const isCursorRow = rowIdx === cursorRow && !playbackState.isPlaying;
              const isBeat = rowIdx % 4 === 0;
              const isMajor = rowIdx % 16 === 0;

              let rowClass = gridRowAlt;
              if (isCurrentPlayingRow) {
                rowClass = 'bg-emerald-600 text-white font-bold';
              } else if (isCursorRow) {
                rowClass = gridCursorRow;
              } else if (isMajor) {
                rowClass = gridRowMajor;
              } else if (isBeat) {
                rowClass = gridRowBeat;
              }

              return (
                <div
                  key={rowIdx}
                  data-row={rowIdx}
                  className={`flex items-center border-b border-slate-700/20 ${rowClass}`}
                >
                  {/* Row Hex Number */}
                  <div
                    className={`w-12 py-1 text-center font-bold text-[11px] border-r border-slate-700/40 select-none ${
                      isCurrentPlayingRow
                        ? 'text-white'
                        : isMajor
                        ? 'text-amber-400'
                        : isBeat
                        ? 'text-slate-300'
                        : 'text-slate-500'
                    }`}
                  >
                    {rowIdx.toString(16).toUpperCase().padStart(2, '0')}
                  </div>

                  {/* 4 Channel Tracker Cells */}
                  <div className="flex-1 grid grid-cols-4">
                    {[0, 1, 2, 3].map((ch) => {
                      const patIdx = song.orderMatrix[ch]?.[currentOrder] ?? 0;
                      const pattern = song.patterns[patIdx] || [];
                      const cell: TCell = pattern[rowIdx] || {
                        note: NO_NOTE,
                        instrument: 0,
                        volume: 0,
                        effectCode: 0,
                        effectParams: 0,
                      };

                      const isSelectedChannel = cursorChannel === ch;
                      const noteText = cell.note !== NO_NOTE ? NOTE_NAMES[cell.note] || '???' : '...';
                      const instText = cell.instrument ? cell.instrument.toString(16).toUpperCase().padStart(2, '0') : '..';
                      const volText = cell.volume ? cell.volume.toString(16).toUpperCase() : '.';
                      const effCodeText = cell.effectCode ? cell.effectCode.toString(16).toUpperCase() : '.';
                      const effParamText =
                        cell.effectCode || cell.effectParams
                          ? cell.effectParams.toString(16).toUpperCase().padStart(2, '0')
                          : '..';

                      return (
                        <div
                          key={ch}
                          onClick={() => onCursorChange(rowIdx, ch, 0)}
                          className={`px-3 py-1 border-r border-slate-700/40 flex items-center justify-between text-xs cursor-text ${
                            isSelectedChannel && isCursorRow ? (isLight ? 'ring-1 ring-sky-500' : 'ring-1 ring-cyan-400') : ''
                          }`}
                        >
                          {/* Note Column */}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onCursorChange(rowIdx, ch, 0);
                            }}
                            className={`font-bold ${
                              cell.note !== NO_NOTE
                                ? ch === 0
                                  ? 'text-sky-400'
                                  : ch === 1
                                  ? 'text-emerald-400'
                                  : ch === 2
                                  ? 'text-amber-400'
                                  : 'text-purple-400'
                                : 'text-slate-500'
                            } ${isSelectedChannel && isCursorRow && cursorColumn === 0 ? 'bg-cyan-600 text-white px-0.5 rounded' : ''}`}
                          >
                            {noteText}
                          </span>

                          {/* Instrument Column */}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onCursorChange(rowIdx, ch, 1);
                            }}
                            className={`${cell.instrument ? 'text-blue-400' : 'text-slate-600'} ${
                              isSelectedChannel && isCursorRow && cursorColumn === 1 ? 'bg-cyan-600 text-white px-0.5 rounded' : ''
                            }`}
                          >
                            {instText}
                          </span>

                          {/* Volume Column */}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onCursorChange(rowIdx, ch, 2);
                            }}
                            className={`${cell.volume ? 'text-amber-300' : 'text-slate-600'} ${
                              isSelectedChannel && isCursorRow && cursorColumn === 2 ? 'bg-cyan-600 text-white px-0.5 rounded' : ''
                            }`}
                          >
                            {volText}
                          </span>

                          {/* Effect Column */}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onCursorChange(rowIdx, ch, 3);
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              onOpenEffectHelper(ch, rowIdx);
                            }}
                            className={`${cell.effectCode ? 'text-rose-400 font-bold' : 'text-slate-600'} ${
                              isSelectedChannel && isCursorRow && (cursorColumn === 3 || cursorColumn === 4)
                                ? 'bg-cyan-600 text-white px-0.5 rounded'
                                : ''
                            }`}
                            title={cell.effectCode ? `FX ${cell.effectCode.toString(16).toUpperCase()}: Double click to inspect` : ''}
                          >
                            {effCodeText} {effParamText}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. FURNACE BOTTOM WORKSTATION DOCK (TABS: INST / WAVE / SONG)            */}
      {/* ========================================================================= */}
      <div className={`h-60 border-t ${dockBg} flex flex-col shrink-0`}>
        {/* Tab Headers */}
        <div className={`flex items-center justify-between px-2 border-b ${panelHeaderBg} text-xs font-bold`}>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveBottomTab('instrument')}
              className={`px-3 py-1.5 border-b-2 flex items-center gap-1.5 ${
                activeBottomTab === 'instrument'
                  ? 'border-cyan-400 text-cyan-400 bg-black/10'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Instrument Editor</span>
            </button>

            <button
              onClick={() => setActiveBottomTab('wave')}
              className={`px-3 py-1.5 border-b-2 flex items-center gap-1.5 ${
                activeBottomTab === 'wave'
                  ? 'border-cyan-400 text-cyan-400 bg-black/10'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Wavetable Bank</span>
            </button>

            <button
              onClick={() => setActiveBottomTab('song')}
              className={`px-3 py-1.5 border-b-2 flex items-center gap-1.5 ${
                activeBottomTab === 'song'
                  ? 'border-cyan-400 text-cyan-400 bg-black/10'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Song Properties</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenGbdkExport}
              className="px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1"
            >
              <FileCode className="w-3 h-3" />
              <span>GBDK Export</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-3 overflow-y-auto">
          {/* TAB 1: INSTRUMENT EDITOR */}
          {activeBottomTab === 'instrument' && (
            <div className="flex flex-wrap gap-4 text-xs">
              {/* Instrument Title & Renamer */}
              <div className="flex flex-col gap-2 w-64">
                <label className="text-slate-400 font-bold">Instrument Name</label>
                <input
                  type="text"
                  value={
                    instBankType === 0 ? dutyInst.name : instBankType === 1 ? waveInst.name : noiseInst.name
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (instBankType === 0) onUpdateDutyInstrument(selectedInstIndex, { name: val });
                    else if (instBankType === 1) onUpdateWaveInstrument(selectedInstIndex, { name: val });
                    else onUpdateNoiseInstrument(selectedInstIndex, { name: val });
                  }}
                  className="px-2 py-1 rounded bg-black/30 border border-slate-700 text-white font-mono"
                />

                {/* Duty Cycle (for Duty Instruments) */}
                {instBankType === 0 && (
                  <div className="flex flex-col gap-1 mt-2">
                    <label className="text-slate-400 font-bold">Duty Cycle</label>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { val: 0, label: '12.5%' },
                        { val: 1, label: '25%' },
                        { val: 2, label: '50%' },
                        { val: 3, label: '75%' },
                      ].map((d) => (
                        <button
                          key={d.val}
                          onClick={() => onUpdateDutyInstrument(selectedInstIndex, { duty: d.val as any })}
                          className={`py-1 rounded font-bold ${
                            dutyInst.duty === d.val ? 'bg-cyan-600 text-white' : buttonBg
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Wave Multiplier (for Wave Instruments) */}
                {instBankType === 1 && (
                  <div className="flex flex-col gap-1 mt-2">
                    <label className="text-slate-400 font-bold">Output Level</label>
                    <div className="grid grid-cols-4 gap-1">
                      {['Mute', '100%', '50%', '25%'].map((lvl, idx) => (
                        <button
                          key={idx}
                          onClick={() => onUpdateWaveInstrument(selectedInstIndex, { outputLevel: idx as any })}
                          className={`py-1 rounded font-bold ${
                            waveInst.outputLevel === idx ? 'bg-cyan-600 text-white' : buttonBg
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Noise Step Mode (for Noise Instruments) */}
                {instBankType === 2 && (
                  <div className="flex flex-col gap-1 mt-2">
                    <label className="text-slate-400 font-bold">Noise Mode (LFSR)</label>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => onUpdateNoiseInstrument(selectedInstIndex, { counterStep: 0 })}
                        className={`py-1 rounded font-bold ${
                          noiseInst.counterStep === 0 ? 'bg-cyan-600 text-white' : buttonBg
                        }`}
                      >
                        15-bit (White)
                      </button>
                      <button
                        onClick={() => onUpdateNoiseInstrument(selectedInstIndex, { counterStep: 1 })}
                        className={`py-1 rounded font-bold ${
                          noiseInst.counterStep === 1 ? 'bg-cyan-600 text-white' : buttonBg
                        }`}
                      >
                        7-bit (Metallic)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Envelope & Sweep Sliders */}
              <div className="flex flex-col gap-3 w-72">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <label className="text-slate-400 font-bold">Initial Volume</label>
                    <span className="font-mono text-cyan-400">
                      {instBankType === 0 ? dutyInst.initialVolume : instBankType === 2 ? noiseInst.initialVolume : 15}/15
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={15}
                    value={instBankType === 0 ? dutyInst.initialVolume : instBankType === 2 ? noiseInst.initialVolume : 15}
                    disabled={instBankType === 1}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (instBankType === 0) onUpdateDutyInstrument(selectedInstIndex, { initialVolume: val });
                      else if (instBankType === 2) onUpdateNoiseInstrument(selectedInstIndex, { initialVolume: val });
                    }}
                    className="w-full accent-cyan-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <label className="text-slate-400 font-bold">Volume Sweep Amount</label>
                    <span className="font-mono text-cyan-400">
                      {instBankType === 0 ? dutyInst.volSweepAmount : instBankType === 2 ? noiseInst.volSweepAmount : 0}/7
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={7}
                    value={instBankType === 0 ? dutyInst.volSweepAmount : instBankType === 2 ? noiseInst.volSweepAmount : 0}
                    disabled={instBankType === 1}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (instBankType === 0) onUpdateDutyInstrument(selectedInstIndex, { volSweepAmount: val });
                      else if (instBankType === 2) onUpdateNoiseInstrument(selectedInstIndex, { volSweepAmount: val });
                    }}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>

              {/* Furnace Visual Envelope Curve Preview */}
              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label className="text-slate-400 font-bold">Volume Envelope Curve</label>
                <div className="h-28 rounded border border-slate-700 bg-black/40 p-2 flex items-end gap-1">
                  {Array.from({ length: 16 }, (_, i) => {
                    const initVol = instBankType === 0 ? dutyInst.initialVolume : instBankType === 2 ? noiseInst.initialVolume : 15;
                    const sweepAmt = instBankType === 0 ? dutyInst.volSweepAmount : instBankType === 2 ? noiseInst.volSweepAmount : 0;
                    const dir = instBankType === 0 ? dutyInst.volSweepDirection : instBankType === 2 ? noiseInst.volSweepDirection : 1;
                    
                    let v = initVol;
                    if (sweepAmt > 0) {
                      const delta = Math.floor(i / sweepAmt);
                      v = dir === 1 ? Math.max(0, initVol - delta) : Math.min(15, initVol + delta);
                    }
                    const hPct = (v / 15) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col justify-end h-full">
                        <div
                          style={{ height: `${hPct}%` }}
                          className="w-full bg-cyan-500 rounded-t-xs opacity-80 hover:opacity-100"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WAVETABLE BANK */}
          {activeBottomTab === 'wave' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-slate-400 font-bold text-xs">Selected Wave (0..15):</label>
                  <select
                    value={selectedWaveIndex}
                    onChange={(e) => setSelectedWaveIndex(Number(e.target.value))}
                    className="px-2 py-1 rounded bg-black/30 border border-slate-700 text-white font-mono text-xs"
                  >
                    {Array.from({ length: 16 }, (_, i) => (
                      <option key={i} value={i}>
                        Wave {i.toString(16).toUpperCase().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  {[
                    {
                      label: 'Sine',
                      fn: () =>
                        Array.from({ length: 32 }, (_, i) =>
                          Math.round((Math.sin((i / 32) * Math.PI * 2) * 0.5 + 0.5) * 15)
                        ),
                    },
                    {
                      label: 'Saw',
                      fn: () => Array.from({ length: 32 }, (_, i) => Math.floor((i / 31) * 15)),
                    },
                    {
                      label: 'Triangle',
                      fn: () =>
                        Array.from({ length: 32 }, (_, i) =>
                          i < 16 ? Math.floor((i / 15) * 15) : Math.floor(((31 - i) / 15) * 15)
                        ),
                    },
                    {
                      label: 'Square',
                      fn: () => Array.from({ length: 32 }, (_, i) => (i < 16 ? 15 : 0)),
                    },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => onUpdateWave(selectedWaveIndex, preset.fn())}
                      className={`px-2 py-1 rounded border text-xs font-bold ${buttonBg}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive 32-sample Waveform Canvas */}
              <canvas
                ref={waveCanvasRef}
                width={800}
                height={120}
                onPointerDown={(e) => {
                  setIsDrawingWave(true);
                  handleWaveCanvasPointer(e);
                }}
                onPointerMove={(e) => {
                  if (isDrawingWave) handleWaveCanvasPointer(e);
                }}
                onPointerUp={() => setIsDrawingWave(false)}
                className="w-full h-28 rounded border border-slate-700 cursor-crosshair touch-none"
              />
            </div>
          )}

          {/* TAB 3: SONG PROPERTIES */}
          {activeBottomTab === 'song' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold">Song Name</label>
                <input
                  type="text"
                  value={song.name}
                  onChange={(e) => onUpdateSong({ name: e.target.value })}
                  className="px-2 py-1 rounded bg-black/30 border border-slate-700 text-white font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold">Artist / Composer</label>
                <input
                  type="text"
                  value={song.artist}
                  onChange={(e) => onUpdateSong({ artist: e.target.value })}
                  className="px-2 py-1 rounded bg-black/30 border border-slate-700 text-white font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold">Ticks Per Row (Speed 1..15)</label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={song.ticksPerRow}
                  onChange={(e) => onUpdateSong({ ticksPerRow: Math.max(1, Number(e.target.value)) })}
                  className="px-2 py-1 rounded bg-black/30 border border-slate-700 text-white font-mono"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. FURNACE STATUS BAR                                                    */}
      {/* ========================================================================= */}
      <div className={`flex items-center justify-between px-3 py-1 text-[10px] border-t ${menuBarBg} text-slate-400 shrink-0`}>
        <div className="flex items-center gap-3">
          <span>SYSTEM: Nintendo Game Boy (DMG-01)</span>
          <span>·</span>
          <span>AUDIO: 44.1 kHz Stereo</span>
          <span>·</span>
          <span>ORD: {currentOrder}</span>
          <span>·</span>
          <span>ROW: {activeRow.toString(16).toUpperCase().padStart(2, '0')}</span>
          <span>·</span>
          <span>OCT: {currentOctave}</span>
          <span>·</span>
          <span>STEP: {currentStep}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold">
            {isRecordMode ? '● EDIT READY' : 'PLAYBACK ONLY'}
          </span>
          <span>·</span>
          <span className="uppercase">THEME: {colorTheme}</span>
        </div>
      </div>

      {/* About Modal */}
      {aboutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className={`w-96 rounded-lg border p-4 shadow-2xl flex flex-col gap-3 text-xs ${dockBg}`}>
            <div className="flex items-center justify-between border-b pb-2 border-slate-700">
              <span className="font-bold text-amber-400 text-sm">About Furnace Tracker UI</span>
              <button onClick={() => setAboutModalOpen(false)} className="hover:text-white">
                ✕
              </button>
            </div>
            <p>
              Furnace is the acclaimed multi-system chiptune tracker by <b>tildearrow</b>.
            </p>
            <p className="text-slate-400">
              This layout replicates Furnace Tracker's interface layout for the Nintendo Game Boy DMG-01 APU, featuring
              4-channel real-time oscilloscopes, modular dockable panels, wavetable graph editing, and full support for both
              Furnace Dark and Furnace Light color schemes.
            </p>
            <div className="flex justify-end pt-2 border-t border-slate-700">
              <button
                onClick={() => setAboutModalOpen(false)}
                className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
