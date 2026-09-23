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
  Sliders,
  Waves,
  Music,
  HelpCircle,
  Folder,
  FileText,
  Radio,
  FileCode,
  Sun,
  Moon,
  VolumeX,
  Smartphone,
  Undo2,
  Redo2,
} from 'lucide-react';
import {
  TSong,
  NOTE_NAMES,
  NO_NOTE,
  TCell,
  TDutyInstrument,
  TWaveInstrument,
  TNoiseInstrument,
  TPattern,
  createEmptyPattern,
} from '../types/uge';
import { audioEngine, PlaybackState } from '../lib/audioEngine';
import { EFFECT_INFO } from './EffectEditorModal';
import { PWAInstallButton } from './PWAInstallButton';

interface ClassicHugeTrackerGuiProps {
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
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onOpenRenderModal?: () => void;
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
  'MelonadeM - Boatship for Rent.uge',
  'Quazar - Funky Stars (excerpt).uge',
  'raphaelgoulart - The Murderous Funk Machine (intro).uge',
  'Reed - Funkabeer\'s Revenge.uge',
  'Soft Maniac - Ryukenden.uge',
  'SVL - UwU.uge',
  'SVL - Yyna.uge',
  'Tempest - Kekri.uge',
  'Unknown Artist - Cognition.uge',
];

const KEY_TO_SEMITONE: Record<string, number> = {
  z: 0,
  s: 1,
  x: 2,
  d: 3,
  c: 4,
  v: 5,
  g: 6,
  b: 7,
  h: 8,
  n: 9,
  j: 10,
  m: 11,
  ',': 12,
  q: 12,
  '2': 13,
  w: 14,
  '3': 15,
  e: 16,
  r: 17,
  '5': 18,
  t: 19,
  '6': 20,
  y: 21,
  '7': 22,
  u: 23,
  i: 24,
};

function getEffectColor(effectCode: number, isLight: boolean): string {
  if (effectCode === 0) return isLight ? 'text-gray-400' : 'text-zinc-600';

  if (!isLight) {
    switch (effectCode) {
      case 1:
      case 2:
      case 3:
      case 4:
        return 'text-cyan-400 font-semibold';
      case 0x0a:
      case 0x0c:
        return 'text-emerald-400 font-semibold';
      case 8:
        return 'text-amber-400 font-semibold';
      case 5:
      case 0x0b:
      case 0x0d:
      case 0x0f:
        return 'text-blue-400 font-semibold';
      default:
        return 'text-purple-400 font-semibold';
    }
  } else {
    switch (effectCode) {
      case 1:
      case 2:
      case 3:
      case 4:
        return 'text-[#006262] font-semibold';
      case 0x0a:
      case 0x0c:
        return 'text-[#007f26] font-semibold';
      case 8:
        return 'text-[#7f7f00] font-semibold';
      case 5:
      case 0x0b:
      case 0x0d:
      case 0x0f:
        return 'text-[#00007f] font-semibold';
      default:
        return 'text-[#800040] font-semibold';
    }
  }
}

export interface ClassicTrackerOptions {
  showScopes: boolean;
  previewOnPlace: boolean;
  previewOnBump: boolean;
  hexPatternRows: boolean;
  hexOrderRows: boolean;
  gridWaveform: boolean;
  tabsVertical: boolean;
}

const DEFAULT_OPTIONS: ClassicTrackerOptions = {
  showScopes: true,
  previewOnPlace: true,
  previewOnBump: true,
  hexPatternRows: false,
  hexOrderRows: false,
  gridWaveform: true,
  tabsVertical: false,
};

export const ClassicHugeTrackerGui: React.FC<ClassicHugeTrackerGuiProps> = ({
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
  colorTheme = 'light',
  onToggleColorTheme,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onOpenRenderModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const oscCanvasesRef = useRef<(HTMLCanvasElement | null)[]>([null, null, null, null]);

  const isLight = colorTheme === 'light';

  // Tracker Options State matching Screenshot 1
  const [options, setOptions] = useState<ClassicTrackerOptions>(() => {
    try {
      const saved = localStorage.getItem('hugetracker_options');
      if (saved) return { ...DEFAULT_OPTIONS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_OPTIONS;
  });

  const [optionsModalOpen, setOptionsModalOpen] = useState<boolean>(false);
  const [optionsActiveTab, setOptionsActiveTab] = useState<'General' | 'Keyboard' | 'Appearance'>('General');

  const updateOption = <K extends keyof ClassicTrackerOptions>(key: K, value: ClassicTrackerOptions[K]) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem('hugetracker_options', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Adjustable Sidebar Width State (Image 2)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('hugetracker_sidebar_width');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 130 && val <= 460) return val;
      }
    } catch {}
    return 210;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);

  const handleSidebarResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
  };

  useEffect(() => {
    if (!isResizingSidebar) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(130, Math.min(460, e.clientX));
      setSidebarWidth(newWidth);
      try {
        localStorage.setItem('hugetracker_sidebar_width', newWidth.toString());
      } catch {}
    };
    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar]);

  // Multi-cell Drag Selection in Tracker Grid
  const [selection, setSelection] = useState<{
    startRow: number;
    startCh: number;
    endRow: number;
    endCh: number;
  } | null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);

  // Block clipboard for multi-cell copy/paste
  const [clipboardBlock, setClipboardBlock] = useState<{
    rows: number;
    cols: number;
    data: TCell[][];
  } | null>(null);

  // Mouse up to end drag selection
  useEffect(() => {
    const handleMouseUp = () => {
      setIsSelecting(false);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Compute selection bounds
  const selectionBounds = selection
    ? {
        minRow: Math.min(selection.startRow, selection.endRow),
        maxRow: Math.max(selection.startRow, selection.endRow),
        minCh: Math.min(selection.startCh, selection.endCh),
        maxCh: Math.max(selection.startCh, selection.endCh),
        isMulti:
          Math.min(selection.startRow, selection.endRow) !== Math.max(selection.startRow, selection.endRow) ||
          Math.min(selection.startCh, selection.endCh) !== Math.max(selection.startCh, selection.endCh),
      }
    : null;

  // Active top-level PageControl tab: 'General', 'Patterns', 'Instruments', 'Waves', 'Comments', 'Routines'
  const [activeMainTab, setActiveMainTab] = useState<'General' | 'Patterns' | 'Instruments' | 'Waves' | 'Comments' | 'Routines'>('Patterns');

  // Menu Dropdown state
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [aboutModal, setAboutModal] = useState(false);

  // Selected TreeView item
  const [treeExpanded, setTreeExpanded] = useState<Record<string, boolean>>({
    instruments: true,
    duty: true,
    wave: true,
    noise: true,
  });

  // Context Menu state
  const [trackerContextMenu, setTrackerContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    channel: number;
    row: number;
  } | null>(null);

  const [orderContextMenu, setOrderContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    orderIndex: number;
  } | null>(null);

  // Clipboard for cell cut/copy/paste
  const [clipboardCell, setClipboardCell] = useState<TCell | null>(null);

  // Search filter in Routines / FX Tab
  const [effectSearchFilter, setEffectSearchFilter] = useState('');

  // Instrument Editor state: 0 = Duty, 1 = Wave, 2 = Noise
  const [selectedInstType, setSelectedInstType] = useState<0 | 1 | 2>(0);
  const [selectedInstIndex, setSelectedInstIndex] = useState<number>(0);
  const [selectedWaveIndex, setSelectedWaveIndex] = useState<number>(0);

  // Subpattern grid cursor in Instrument Editor
  const [subRow, setSubRow] = useState<number>(0);
  const [subCol, setSubCol] = useState<number>(0); // 0 = Note Transpose, 1 = Inst, 2 = Jump/Vol, 3 = Effect Code, 4 = Effect Param

  // Wave drawing state
  const [isDrawingWave, setIsDrawingWave] = useState(false);
  const [playWhileDrawing, setPlayWhileDrawing] = useState(false);

  // Helper for current instrument object
  const currentInst =
    selectedInstType === 0
      ? song.dutyInstruments[selectedInstIndex]
      : selectedInstType === 1
      ? song.waveInstruments[selectedInstIndex]
      : song.noiseInstruments[selectedInstIndex];

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

  // Sync active order during playback
  const activeOrd = playbackState.isPlaying ? playbackState.orderIndex : currentOrder;
  const activeR = playbackState.isPlaying ? playbackState.row : cursorRow;

  // Auto-scroll tracker grid on playback or cursor change
  useEffect(() => {
    if (activeMainTab === 'Patterns' && gridContainerRef.current) {
      const rowElem = gridContainerRef.current.querySelector(`[data-row-index="${activeR}"]`);
      if (rowElem) {
        rowElem.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      }
    }
  }, [activeR, activeMainTab]);

  // Real-time Oscilloscope animation across top banner (toggleable via options)
  useEffect(() => {
    if (!options.showScopes) return;
    let animId: number;
    const drawScopes = () => {
      oscCanvasesRef.current.forEach((canvas, ch) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const width = canvas.width;
        const height = canvas.height;

        // Dark oscilloscope CRT background
        ctx.fillStyle = '#05110a';
        ctx.fillRect(0, 0, width, height);

        // Center line
        ctx.strokeStyle = '#0f2818';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        const meter = meters[ch] || 0;
        const isMuted = mutedChannels[ch];
        const apu = audioEngine.apu;
        const chSound = apu ? apu.snd[ch] : null;
        const isSoundActive = (playbackState.isPlaying && meter > 0.015 && !isMuted) || (chSound?.enable && chSound.vol > 0 && !isMuted);

        if (isSoundActive && apu) {
          ctx.strokeStyle = '#4af682';
          ctx.lineWidth = 1.75;
          ctx.beginPath();

          const timeOffset = Date.now() / 1000;
          const amp = Math.min(1, Math.max(0.25, ((chSound?.vol || 12) / 15) * 0.85 + meter * 0.35)) * (height * 0.42);

          if (ch === 0 || ch === 1) {
            // Pulse 1 & Pulse 2: Actual Game Boy Hardware Duty Cycle
            const regIdx = ch === 0 ? 1 : 6;
            const dutyBits = (apu.regs[regIdx] >> 6) & 3;
            // GB Duty: 0 = 12.5%, 1 = 25%, 2 = 50%, 3 = 75%
            const dutyRatios = [0.125, 0.25, 0.50, 0.75];
            const dutyRatio = dutyRatios[dutyBits] ?? 0.5;

            const rawFreq = Math.max(100, Math.min(2040, chSound?.freq || 1500));
            const numPeriods = 3 + ((rawFreq - 100) / 1940) * 5;
            const phaseShift = (timeOffset * (rawFreq / 140)) % 1;

            let prevHigh: boolean | null = null;
            for (let x = 0; x < width; x++) {
              const normX = x / width;
              const cyclePhase = (normX * numPeriods + phaseShift) % 1;
              const isHigh = cyclePhase < dutyRatio;
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
            // Wave Synthesizer: Actual 32 4-bit Samples from APU Wave RAM registers 0x20..0x2F
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

            const rawFreq = Math.max(100, Math.min(2040, chSound?.freq || 1400));
            const numPeriods = 2.5 + ((rawFreq - 100) / 1940) * 4.5;
            const phaseShift = (timeOffset * (rawFreq / 140)) % 1;

            let prevSampleIdx = -1;
            for (let x = 0; x < width; x++) {
              const normX = x / width;
              const cyclePhase = (normX * numPeriods + phaseShift) % 1;
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
            // Noise: Authentic Pseudo-Random Noise from LFSR
            const is7bit = ((apu.regs[0x12] || 0) & 0x08) !== 0;
            const speed = Math.max(1, 16 - ((apu.regs[0x12] || 0) >> 4));
            const shiftPhase = Math.floor(timeOffset * 60 * speed);

            let prevNoiseBit: number | null = null;
            for (let x = 0; x < width; x++) {
              const step = Math.floor((x / width) * 48 + shiftPhase);
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
          ctx.strokeStyle = '#1a3d24';
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
  }, [meters, playbackState.isPlaying, mutedChannels, options.showScopes]);

  // Waveform canvas rendering & interactive drawing
  const currentWaveSamples = song.waves[selectedWaveIndex] || Array(32).fill(0);

  const drawWaveCanvas = useCallback(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    // Dark background matching Screenshot 3
    ctx.fillStyle = '#061317';
    ctx.fillRect(0, 0, w, h);

    // Dotted grid lines (toggleable via options)
    if (options.gridWaveform) {
      ctx.strokeStyle = '#15323a';
      ctx.setLineDash([2, 4]);
      ctx.lineWidth = 1;

      // 16 horizontal level lines (0..15)
      for (let lvl = 0; lvl <= 15; lvl++) {
        const y = h - (lvl / 15) * (h - 20) - 10;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 32 vertical sample step lines
      for (let s = 0; s < 32; s++) {
        const x = (s / 31) * (w - 20) + 10;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    ctx.setLineDash([]);

    // Bright green connected waveform line
    ctx.strokeStyle = '#57e376';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let s = 0; s < 32; s++) {
      const val = currentWaveSamples[s] ?? 0;
      const x = (s / 31) * (w - 20) + 10;
      const y = h - (val / 15) * (h - 20) - 10;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Sample node points
    for (let s = 0; s < 32; s++) {
      const val = currentWaveSamples[s] ?? 0;
      const x = (s / 31) * (w - 20) + 10;
      const y = h - (val / 15) * (h - 20) - 10;
      ctx.fillStyle = '#a1ffba';
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }, [currentWaveSamples]);

  useEffect(() => {
    if (activeMainTab === 'Waves') {
      drawWaveCanvas();
    }
  }, [activeMainTab, drawWaveCanvas]);

  const handleWaveCanvasInteract = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const normX = Math.max(0, Math.min(1, clientX / rect.width));
    const normY = Math.max(0, Math.min(1, 1 - clientY / rect.height));

    const sampleIdx = Math.max(0, Math.min(31, Math.round(normX * 31)));
    const sampleVal = Math.max(0, Math.min(15, Math.round(normY * 15)));

    const newSamples = [...currentWaveSamples];
    newSamples[sampleIdx] = sampleVal;
    onUpdateWave(selectedWaveIndex, newSamples);

    if (playWhileDrawing) {
      onPreviewNote(2, 24, selectedWaveIndex + 1);
    }
  };

  // Tracker Cell Actions
  const handleCutCell = useCallback(() => {
    if (selectionBounds && selectionBounds.isMulti) {
      const { minRow, maxRow, minCh, maxCh } = selectionBounds;
      const block: TCell[][] = [];
      const newPatterns = { ...song.patterns };
      for (let r = minRow; r <= maxRow; r++) {
        const rowData: TCell[] = [];
        for (let c = minCh; c <= maxCh; c++) {
          const patIdx = song.orderMatrix[c]?.[activeOrd] ?? 0;
          const cell = song.patterns[patIdx]?.[r] || {
            note: NO_NOTE,
            instrument: 0,
            volume: 0,
            effectCode: 0,
            effectParams: 0,
          };
          rowData.push({ ...cell });
        }
        block.push(rowData);
      }
      setClipboardBlock({ rows: maxRow - minRow + 1, cols: maxCh - minCh + 1, data: block });
      for (let c = minCh; c <= maxCh; c++) {
        const patIdx = song.orderMatrix[c]?.[activeOrd] ?? 0;
        const pat = newPatterns[patIdx] ? [...newPatterns[patIdx]] : createEmptyPattern();
        for (let r = minRow; r <= maxRow; r++) {
          pat[r] = { note: NO_NOTE, instrument: 0, volume: 0, effectCode: 0, effectParams: 0 };
        }
        newPatterns[patIdx] = pat;
      }
      onUpdateSong({ patterns: newPatterns });
    } else {
      const patIdx = song.orderMatrix[cursorChannel]?.[activeOrd] ?? 0;
      const cell = song.patterns[patIdx]?.[cursorRow];
      if (cell) setClipboardCell({ ...cell });
      onUpdateCell(cursorChannel, cursorRow, {
        note: NO_NOTE,
        instrument: 0,
        volume: 0,
        effectCode: 0,
        effectParams: 0,
      });
    }
    setTrackerContextMenu(null);
  }, [selectionBounds, song, activeOrd, cursorChannel, cursorRow, onUpdateCell, onUpdateSong]);

  const handleCopyCell = useCallback(() => {
    if (selectionBounds && selectionBounds.isMulti) {
      const { minRow, maxRow, minCh, maxCh } = selectionBounds;
      const block: TCell[][] = [];
      for (let r = minRow; r <= maxRow; r++) {
        const rowData: TCell[] = [];
        for (let c = minCh; c <= maxCh; c++) {
          const patIdx = song.orderMatrix[c]?.[activeOrd] ?? 0;
          const cell = song.patterns[patIdx]?.[r] || {
            note: NO_NOTE,
            instrument: 0,
            volume: 0,
            effectCode: 0,
            effectParams: 0,
          };
          rowData.push({ ...cell });
        }
        block.push(rowData);
      }
      setClipboardBlock({ rows: maxRow - minRow + 1, cols: maxCh - minCh + 1, data: block });
    } else {
      const patIdx = song.orderMatrix[cursorChannel]?.[activeOrd] ?? 0;
      const cell = song.patterns[patIdx]?.[cursorRow];
      if (cell) setClipboardCell({ ...cell });
    }
    setTrackerContextMenu(null);
  }, [selectionBounds, song, activeOrd, cursorChannel, cursorRow]);

  const handlePasteCell = useCallback(() => {
    if (clipboardBlock) {
      const newPatterns = { ...song.patterns };
      for (let rOffset = 0; rOffset < clipboardBlock.rows; rOffset++) {
        const targetRow = cursorRow + rOffset;
        if (targetRow >= 64) break;
        for (let cOffset = 0; cOffset < clipboardBlock.cols; cOffset++) {
          const targetCh = cursorChannel + cOffset;
          if (targetCh >= 4) break;
          const patIdx = song.orderMatrix[targetCh]?.[activeOrd] ?? 0;
          const pat = newPatterns[patIdx] ? [...newPatterns[patIdx]] : createEmptyPattern();
          pat[targetRow] = { ...clipboardBlock.data[rOffset][cOffset] };
          newPatterns[patIdx] = pat;
        }
      }
      onUpdateSong({ patterns: newPatterns });
    } else if (clipboardCell) {
      onUpdateCell(cursorChannel, cursorRow, { ...clipboardCell });
    }
    setTrackerContextMenu(null);
  }, [clipboardBlock, clipboardCell, cursorRow, cursorChannel, song, activeOrd, onUpdateSong, onUpdateCell]);

  const handleDeleteCell = useCallback(() => {
    if (selectionBounds && selectionBounds.isMulti) {
      const { minRow, maxRow, minCh, maxCh } = selectionBounds;
      const newPatterns = { ...song.patterns };
      for (let c = minCh; c <= maxCh; c++) {
        const patIdx = song.orderMatrix[c]?.[activeOrd] ?? 0;
        const pat = newPatterns[patIdx] ? [...newPatterns[patIdx]] : createEmptyPattern();
        for (let r = minRow; r <= maxRow; r++) {
          pat[r] = { note: NO_NOTE, instrument: 0, volume: 0, effectCode: 0, effectParams: 0 };
        }
        newPatterns[patIdx] = pat;
      }
      onUpdateSong({ patterns: newPatterns });
    } else {
      onUpdateCell(cursorChannel, cursorRow, {
        note: NO_NOTE,
        instrument: 0,
        volume: 0,
        effectCode: 0,
        effectParams: 0,
      });
    }
    setTrackerContextMenu(null);
  }, [selectionBounds, song, activeOrd, cursorChannel, cursorRow, onUpdateCell, onUpdateSong]);

  const handleInsertRow = useCallback(() => {
    const patIdx = song.orderMatrix[cursorChannel]?.[activeOrd] ?? 0;
    const curPat = song.patterns[patIdx] ? [...song.patterns[patIdx]] : createEmptyPattern();
    for (let r = 63; r > cursorRow; r--) {
      curPat[r] = { ...curPat[r - 1] };
    }
    curPat[cursorRow] = { note: NO_NOTE, instrument: 0, volume: 0, effectCode: 0, effectParams: 0 };
    onUpdateSong({
      patterns: { ...song.patterns, [patIdx]: curPat },
    });
    setTrackerContextMenu(null);
  }, [song, cursorChannel, activeOrd, cursorRow, onUpdateSong]);

  const handleDeleteRow = useCallback(() => {
    const patIdx = song.orderMatrix[cursorChannel]?.[activeOrd] ?? 0;
    const curPat = song.patterns[patIdx] ? [...song.patterns[patIdx]] : createEmptyPattern();
    for (let r = cursorRow; r < 63; r++) {
      curPat[r] = { ...curPat[r + 1] };
    }
    curPat[63] = { note: NO_NOTE, instrument: 0, volume: 0, effectCode: 0, effectParams: 0 };
    onUpdateSong({
      patterns: { ...song.patterns, [patIdx]: curPat },
    });
    setTrackerContextMenu(null);
  }, [song, cursorChannel, activeOrd, cursorRow, onUpdateSong]);

  const handleTranspose = useCallback((semitones: number) => {
    if (selectionBounds && selectionBounds.isMulti) {
      const { minRow, maxRow, minCh, maxCh } = selectionBounds;
      const newPatterns = { ...song.patterns };
      let previewNotePlayed = false;
      for (let c = minCh; c <= maxCh; c++) {
        const patIdx = song.orderMatrix[c]?.[activeOrd] ?? 0;
        const pat = newPatterns[patIdx] ? [...newPatterns[patIdx]] : createEmptyPattern();
        for (let r = minRow; r <= maxRow; r++) {
          const cell = pat[r];
          if (cell && cell.note !== undefined && cell.note !== NO_NOTE && cell.note < 72) {
            const newNote = Math.max(0, Math.min(71, cell.note + semitones));
            pat[r] = { ...cell, note: newNote };
            if (!previewNotePlayed && options.previewOnBump) {
              onPreviewNote(c, newNote, cell.instrument || currentInstrument);
              previewNotePlayed = true;
            }
          }
        }
        newPatterns[patIdx] = pat;
      }
      onUpdateSong({ patterns: newPatterns });
    } else {
      const patIdx = song.orderMatrix[cursorChannel]?.[activeOrd] ?? 0;
      const cell = song.patterns[patIdx]?.[cursorRow];
      if (cell && cell.note !== undefined && cell.note !== NO_NOTE) {
        const newNote = Math.max(0, Math.min(71, cell.note + semitones));
        onUpdateCell(cursorChannel, cursorRow, { note: newNote });
        if (options.previewOnBump) {
          onPreviewNote(cursorChannel, newNote, cell.instrument || currentInstrument);
        }
      }
    }
    setTrackerContextMenu(null);
  }, [selectionBounds, song, activeOrd, cursorChannel, cursorRow, onUpdateCell, onUpdateSong, onPreviewNote, currentInstrument, options.previewOnBump]);

  const handleSetInstrument = useCallback(() => {
    if (selectionBounds && selectionBounds.isMulti) {
      const { minRow, maxRow, minCh, maxCh } = selectionBounds;
      const newPatterns = { ...song.patterns };
      for (let c = minCh; c <= maxCh; c++) {
        const patIdx = song.orderMatrix[c]?.[activeOrd] ?? 0;
        const pat = newPatterns[patIdx] ? [...newPatterns[patIdx]] : createEmptyPattern();
        for (let r = minRow; r <= maxRow; r++) {
          pat[r] = { ...pat[r], instrument: currentInstrument };
        }
        newPatterns[patIdx] = pat;
      }
      onUpdateSong({ patterns: newPatterns });
    } else {
      onUpdateCell(cursorChannel, cursorRow, { instrument: currentInstrument });
    }
    setTrackerContextMenu(null);
  }, [selectionBounds, song, activeOrd, cursorChannel, cursorRow, currentInstrument, onUpdateCell, onUpdateSong]);

  // Keyboard navigation & editing in Tracker Grid
  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    // Undo / Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        onRedo?.();
      } else {
        onUndo?.();
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      onRedo?.();
      return;
    }

    // Render Song shortcut
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      onOpenRenderModal?.();
      return;
    }

    // Cut, Copy, Paste, Undo shortcuts
    if (e.ctrlKey && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      handleCutCell();
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      handleCopyCell();
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      handlePasteCell();
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      handleSetInstrument();
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      onOpenEffectHelper(cursorChannel, cursorRow);
      return;
    }

    // Insert / Delete row
    if (e.key === 'Insert') {
      e.preventDefault();
      handleInsertRow();
      return;
    }
    if (e.shiftKey && e.key === 'Delete') {
      e.preventDefault();
      handleDeleteRow();
      return;
    }

    // Transpose shortcuts (Shift+Up/Down = 1 semitone, Ctrl+Up/Down = 12 semitones)
    if (e.shiftKey && e.key === 'ArrowUp') {
      e.preventDefault();
      handleTranspose(1);
      return;
    }
    if (e.shiftKey && e.key === 'ArrowDown') {
      e.preventDefault();
      handleTranspose(-1);
      return;
    }
    if (e.ctrlKey && e.key === 'ArrowUp') {
      e.preventDefault();
      handleTranspose(12);
      return;
    }
    if (e.ctrlKey && e.key === 'ArrowDown') {
      e.preventDefault();
      handleTranspose(-12);
      return;
    }

    // Space = Play / Stop toggle
    if (e.key === ' ') {
      e.preventDefault();
      if (playbackState.isPlaying) {
        onStop();
      } else {
        onPlay(e.shiftKey);
      }
      return;
    }

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

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (selectionBounds && selectionBounds.isMulti) {
        handleDeleteCell();
      } else {
        if (cursorColumn === 0) onUpdateCell(cursorChannel, cursorRow, { note: NO_NOTE });
        else if (cursorColumn === 1) onUpdateCell(cursorChannel, cursorRow, { instrument: 0 });
        else if (cursorColumn === 2) onUpdateCell(cursorChannel, cursorRow, { volume: 0 });
        else if (cursorColumn === 3) onUpdateCell(cursorChannel, cursorRow, { effectCode: 0 });
        else if (cursorColumn === 4) onUpdateCell(cursorChannel, cursorRow, { effectParams: 0 });
      }
      return;
    }

    // Note entry
    const keyLower = e.key.toLowerCase();
    if (cursorColumn === 0 && KEY_TO_SEMITONE[keyLower] !== undefined) {
      e.preventDefault();
      const semitoneOffset = KEY_TO_SEMITONE[keyLower];
      const baseNote = (currentOctave - 3) * 12;
      const targetNote = baseNote + semitoneOffset;

      if (targetNote >= 0 && targetNote < 72) {
        onUpdateCell(cursorChannel, cursorRow, {
          note: targetNote,
          instrument: currentInstrument,
        });
        if (options.previewOnPlace) {
          onPreviewNote(cursorChannel, targetNote, currentInstrument);
        }
        if (currentStep > 0) {
          onCursorChange(Math.min(63, cursorRow + currentStep), cursorChannel, cursorColumn);
        }
      }
      return;
    }

    // Hex entries for Inst, Vol, Effect
    if (cursorColumn === 1 && /^[0-9a-fA-F]$/.test(e.key)) {
      e.preventDefault();
      onUpdateCell(cursorChannel, cursorRow, { instrument: parseInt(e.key, 16) });
      if (currentStep > 0) onCursorChange(Math.min(63, cursorRow + currentStep), cursorChannel, cursorColumn);
      return;
    }
    if (cursorColumn === 2 && /^[0-9a-fA-F]$/.test(e.key)) {
      e.preventDefault();
      onUpdateCell(cursorChannel, cursorRow, { volume: parseInt(e.key, 16) });
      if (currentStep > 0) onCursorChange(Math.min(63, cursorRow + currentStep), cursorChannel, cursorColumn);
      return;
    }
    if (cursorColumn === 3 && /^[0-9a-fA-F]$/.test(e.key)) {
      e.preventDefault();
      onUpdateCell(cursorChannel, cursorRow, { effectCode: parseInt(e.key, 16) });
      onCursorChange(cursorRow, cursorChannel, 4);
      return;
    }
    if (cursorColumn === 4 && /^[0-9a-fA-F]$/.test(e.key)) {
      e.preventDefault();
      const patIdx = song.orderMatrix[cursorChannel]?.[activeOrd] ?? 0;
      const curCell = song.patterns[patIdx]?.[cursorRow] || { effectParams: 0 };
      const newParam = ((curCell.effectParams << 4) | parseInt(e.key, 16)) & 0xff;
      onUpdateCell(cursorChannel, cursorRow, { effectParams: newParam });
      return;
    }
  };

  // Subpattern Cell Update Helper
  const handleUpdateSubpatternCell = (row: number, updates: Partial<TCell>) => {
    const subpat = currentInst?.subpattern ? [...currentInst.subpattern] : createEmptyPattern();
    subpat[row] = { ...subpat[row], ...updates };

    if (selectedInstType === 0) onUpdateDutyInstrument(selectedInstIndex, { subpattern: subpat });
    else if (selectedInstType === 1) onUpdateWaveInstrument(selectedInstIndex, { subpattern: subpat });
    else if (selectedInstType === 2) onUpdateNoiseInstrument(selectedInstIndex, { subpattern: subpat });
  };

  // Keyboard navigation & editing in Subpattern Grid
  const handleSubpatternKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSubRow((r) => Math.max(0, r - 1));
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSubRow((r) => Math.min(31, r + 1));
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSubCol((c) => Math.max(0, c - 1));
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSubCol((c) => Math.min(4, c + 1));
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (subCol === 0) handleUpdateSubpatternCell(subRow, { note: NO_NOTE });
      else if (subCol === 1) handleUpdateSubpatternCell(subRow, { instrument: 0 });
      else if (subCol === 2) handleUpdateSubpatternCell(subRow, { volume: 0 });
      else if (subCol === 3) handleUpdateSubpatternCell(subRow, { effectCode: 0 });
      else if (subCol === 4) handleUpdateSubpatternCell(subRow, { effectParams: 0 });
      return;
    }

    // Note Transpose entry (keys centered around 'c' = 36 / +00)
    const keyLower = e.key.toLowerCase();
    if (subCol === 0 && KEY_TO_SEMITONE[keyLower] !== undefined) {
      e.preventDefault();
      const semitone = KEY_TO_SEMITONE[keyLower];
      // 36 represents 0 transpose
      const targetTransposeNote = 36 + (semitone - 4);
      handleUpdateSubpatternCell(subRow, { note: targetTransposeNote });
      setSubRow((r) => Math.min(31, r + 1));
      return;
    }

    // Inst / Jump hex entry
    if ((subCol === 1 || subCol === 2) && /^[0-9a-fA-F]$/.test(e.key)) {
      e.preventDefault();
      const val = parseInt(e.key, 16);
      if (subCol === 1) handleUpdateSubpatternCell(subRow, { instrument: val });
      else handleUpdateSubpatternCell(subRow, { volume: val });
      setSubRow((r) => Math.min(31, r + 1));
      return;
    }

    // Effect code entry
    if (subCol === 3 && /^[0-9a-fA-F]$/.test(e.key)) {
      e.preventDefault();
      handleUpdateSubpatternCell(subRow, { effectCode: parseInt(e.key, 16) });
      setSubCol(4);
      return;
    }

    // Effect params entry
    if (subCol === 4 && /^[0-9a-fA-F]$/.test(e.key)) {
      e.preventDefault();
      const curCell = currentInst?.subpattern?.[subRow] || { effectParams: 0 };
      const newParam = ((curCell.effectParams << 4) | parseInt(e.key, 16)) & 0xff;
      handleUpdateSubpatternCell(subRow, { effectParams: newParam });
      return;
    }
  };

  // Convert 32 wave samples to hex representation string
  const waveHex = currentWaveSamples.map((v) => (v & 0x0f).toString(16).toUpperCase()).join('');

  const handleHexWaveInput = (hex: string) => {
    const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '').slice(0, 32);
    const newSamples = Array(32).fill(0);
    for (let i = 0; i < cleanHex.length; i++) {
      newSamples[i] = parseInt(cleanHex[i], 16);
    }
    onUpdateWave(selectedWaveIndex, newSamples);
  };

  return (
    <div
      className={`flex flex-col h-screen w-screen select-none font-sans overflow-hidden ${
        isLight ? 'bg-[#ece9d8] text-black' : 'bg-[#1e1e24] text-zinc-100'
      }`}
      onClick={() => setActiveMenu(null)}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".uge,.uge5,.uge6"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onLoadUgeFile(file);
            e.target.value = '';
          }
        }}
      />

      {/* Top Window Titlebar (Classic Windows / Lazarus style) */}
      <div
        className={`px-2 py-1 text-xs flex items-center justify-between border-b shrink-0 ${
          isLight
            ? 'bg-gradient-to-r from-[#0055ea] to-[#3a93ff] text-white font-bold border-[#0040b0]'
            : 'bg-zinc-900 text-zinc-200 font-semibold border-zinc-800'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <span className="bg-amber-400 text-black px-1 rounded-[2px] font-mono text-[10px] font-black">hT</span>
          <span className="truncate">
            hUGETracker - [{song.name || 'Blank'} - {song.artist || 'Blank'}]
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] opacity-90 font-mono">
          <span>v1.0.6 (Web Port)</span>
        </div>
      </div>

      {/* Top Menu Bar: File, Edit, Demos, Help */}
      <div
        className={`flex items-center px-1 py-0.5 text-xs border-b relative z-30 shrink-0 ${
          isLight ? 'bg-[#ece9d8] border-[#abb7bc] text-black' : 'bg-[#282830] border-zinc-800 text-zinc-200'
        }`}
      >
        {/* File Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenu(activeMenu === 'file' ? null : 'file');
            }}
            className={`px-2 py-0.5 hover:bg-[#316ac5] hover:text-white rounded-[2px] ${
              activeMenu === 'file' ? 'bg-[#316ac5] text-white' : ''
            }`}
          >
            File
          </button>
          {activeMenu === 'file' && (
            <div
              className={`absolute left-0 top-full mt-0.5 w-52 border shadow-lg py-1 z-40 text-xs ${
                isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-zinc-800 border-zinc-700 text-white'
              }`}
            >
              <button
                onClick={() => {
                  onNewSong();
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#316ac5] hover:text-white flex items-center justify-between"
              >
                <span>New Song</span>
                <span className="text-[10px] opacity-60">Ctrl+N</span>
              </button>
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#316ac5] hover:text-white flex items-center justify-between"
              >
                <span>Open .uge File...</span>
                <span className="text-[10px] opacity-60">Ctrl+O</span>
              </button>
              <button
                onClick={() => {
                  onSaveUgeFile();
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#316ac5] hover:text-white flex items-center justify-between"
              >
                <span>Save As .uge...</span>
                <span className="text-[10px] opacity-60">Ctrl+S</span>
              </button>
              <div className="border-t my-1 border-gray-300 dark:border-zinc-700" />
              <button
                onClick={() => {
                  onOpenRenderModal?.();
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#316ac5] hover:text-white flex items-center justify-between font-semibold"
              >
                <span>Render to WAV...</span>
                <span className="text-[10px] opacity-60">Ctrl+R</span>
              </button>
              <button
                onClick={() => {
                  onOpenGbdkExport();
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#316ac5] hover:text-white flex items-center justify-between"
              >
                <span>Export C Source (GBDK)...</span>
                <span className="text-[10px] opacity-60">Ctrl+E</span>
              </button>
            </div>
          )}
        </div>

        {/* Edit Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenu(activeMenu === 'edit' ? null : 'edit');
            }}
            className={`px-2 py-0.5 hover:bg-[#316ac5] hover:text-white rounded-[2px] ${
              activeMenu === 'edit' ? 'bg-[#316ac5] text-white' : ''
            }`}
          >
            Edit
          </button>
          {activeMenu === 'edit' && (
            <div
              className={`absolute left-0 top-full mt-0.5 w-52 border shadow-lg py-1 z-40 text-xs ${
                isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-zinc-800 border-zinc-700 text-white'
              }`}
            >
              <button
                onClick={() => {
                  onUndo?.();
                  setActiveMenu(null);
                }}
                disabled={!canUndo}
                className={`w-full text-left px-3 py-1 flex items-center justify-between ${
                  canUndo ? 'hover:bg-[#316ac5] hover:text-white' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <span>Undo</span>
                <span className="text-[10px] opacity-60">Ctrl+Z</span>
              </button>
              <button
                onClick={() => {
                  onRedo?.();
                  setActiveMenu(null);
                }}
                disabled={!canRedo}
                className={`w-full text-left px-3 py-1 flex items-center justify-between ${
                  canRedo ? 'hover:bg-[#316ac5] hover:text-white' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <span>Redo</span>
                <span className="text-[10px] opacity-60">Ctrl+Y</span>
              </button>
              <div className="border-t my-1 border-gray-300 dark:border-zinc-700" />
              <button
                onClick={() => {
                  handleCutCell();
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#316ac5] hover:text-white flex items-center justify-between"
              >
                <span>Cut</span>
                <span className="text-[10px] opacity-60">Ctrl+X</span>
              </button>
              <button
                onClick={() => {
                  handleCopyCell();
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#316ac5] hover:text-white flex items-center justify-between"
              >
                <span>Copy</span>
                <span className="text-[10px] opacity-60">Ctrl+C</span>
              </button>
              <button
                onClick={() => {
                  handlePasteCell();
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#316ac5] hover:text-white flex items-center justify-between"
              >
                <span>Paste</span>
                <span className="text-[10px] opacity-60">Ctrl+V</span>
              </button>
              <button
                onClick={() => {
                  handleDeleteCell();
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#316ac5] hover:text-white flex items-center justify-between"
              >
                <span>Delete</span>
                <span className="text-[10px] opacity-60">Del</span>
              </button>
              <div className="border-t my-1 border-gray-300 dark:border-zinc-700" />
              <button
                onClick={() => {
                  setOptionsModalOpen(true);
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#316ac5] hover:text-white flex items-center justify-between font-semibold"
              >
                <span>Options ...</span>
              </button>
            </div>
          )}
        </div>

        {/* Demos Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenu(activeMenu === 'demos' ? null : 'demos');
            }}
            className={`px-2 py-0.5 hover:bg-[#316ac5] hover:text-white rounded-[2px] ${
              activeMenu === 'demos' ? 'bg-[#316ac5] text-white' : ''
            }`}
          >
            Demos
          </button>
          {activeMenu === 'demos' && (
            <div
              className={`absolute left-0 top-full mt-0.5 w-64 max-h-80 overflow-y-auto border shadow-lg py-1 z-40 text-xs ${
                isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-zinc-800 border-zinc-700 text-white'
              }`}
            >
              {SAMPLE_SONGS.map((songName) => (
                <button
                  key={songName}
                  onClick={() => {
                    onLoadSampleSong(songName);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#316ac5] hover:text-white truncate"
                >
                  {songName.replace('.uge', '')}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Help Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenu(activeMenu === 'help' ? null : 'help');
            }}
            className={`px-2 py-0.5 hover:bg-[#316ac5] hover:text-white rounded-[2px] ${
              activeMenu === 'help' ? 'bg-[#316ac5] text-white' : ''
            }`}
          >
            Help
          </button>
          {activeMenu === 'help' && (
            <div
              className={`absolute left-0 top-full mt-0.5 w-44 border shadow-lg py-1 z-40 text-xs ${
                isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-zinc-800 border-zinc-700 text-white'
              }`}
            >
              <button
                onClick={() => {
                  setActiveMainTab('Routines');
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#316ac5] hover:text-white"
              >
                FX Reference Guide
              </button>
              <button
                onClick={() => {
                  setOptionsModalOpen(true);
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#316ac5] hover:text-white"
              >
                Options ...
              </button>
              <button
                onClick={() => {
                  setAboutModal(true);
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#316ac5] hover:text-white"
              >
                About hUGETracker...
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Toolbar matching Screenshot 2 */}
      <div
        className={`flex items-center gap-1.5 px-2 py-1 border-b text-xs shrink-0 flex-wrap ${
          isLight ? 'bg-[#f0ede4] border-[#abb7bc]' : 'bg-[#22222a] border-zinc-800'
        }`}
      >
        <button
          onClick={onSaveUgeFile}
          className="flex items-center gap-1 px-2 py-0.5 bevel-button hover:bg-white text-black font-semibold text-xs"
          title="Save As .uge (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5 text-blue-600" />
          <span>Save As ...</span>
        </button>

        <div className="h-4 w-px bg-gray-300 dark:bg-zinc-700 mx-0.5" />

        {/* Undo / Redo buttons */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex items-center gap-1 px-2 py-0.5 bevel-button text-xs ${
            canUndo ? 'text-black hover:bg-white cursor-pointer' : 'text-gray-400 opacity-50 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`flex items-center gap-1 px-2 py-0.5 bevel-button text-xs ${
            canRedo ? 'text-black hover:bg-white cursor-pointer' : 'text-gray-400 opacity-50 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
          <span>Redo</span>
        </button>

        <div className="h-4 w-px bg-gray-300 dark:bg-zinc-700 mx-0.5" />

        {/* Play / Stop / Step buttons */}
        <button
          onClick={() => onPlay(false)}
          className={`px-2 py-0.5 bevel-button font-bold text-xs flex items-center gap-1 ${
            playbackState.isPlaying ? 'bg-green-100 text-green-800' : 'text-black hover:bg-white'
          }`}
          title="Play Song (Space)"
        >
          <Play className="w-3.5 h-3.5 fill-green-600 text-green-600" />
        </button>
        <button
          onClick={onStop}
          className="px-2 py-0.5 bevel-button text-black hover:bg-white text-xs flex items-center gap-1"
          title="Stop Playback (Space / Esc)"
        >
          <Square className="w-3.5 h-3.5 fill-red-600 text-red-600" />
        </button>
        <button
          onClick={() => onPlay(true)}
          className="px-2 py-0.5 bevel-button text-black hover:bg-white text-xs font-semibold"
          title="Play From Cursor (Ctrl+Space)"
        >
          ▶ From Cursor
        </button>

        <div className="h-4 w-px bg-gray-300 dark:bg-zinc-700 mx-0.5" />

        <button
          onClick={onOpenRenderModal}
          className="flex items-center gap-1 px-2 py-0.5 bevel-button hover:bg-white text-black text-xs font-semibold"
          title="Render Song to WAV Audio (Ctrl+R)"
        >
          <Waves className="w-3.5 h-3.5 text-emerald-600" />
          <span>Render WAV</span>
        </button>

        <button
          onClick={onOpenGbdkExport}
          className="flex items-center gap-1 px-2 py-0.5 bevel-button hover:bg-white text-black text-xs"
          title="Export GB C Source"
        >
          <FileCode className="w-3.5 h-3.5 text-indigo-600" />
          <span>Export GB</span>
        </button>

        <button
          onClick={onPanic}
          className="flex items-center gap-1 px-2 py-0.5 bevel-button hover:bg-white text-black text-xs text-red-700 font-bold"
          title="Kill all sound notes (Panic / F12)"
        >
          <span>Panic</span>
        </button>

        <div className="h-4 w-px bg-gray-300 dark:bg-zinc-700 mx-0.5" />

        {/* Octave Spinner */}
        <div className="flex items-center gap-1 text-xs">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Octave</span>
          <input
            type="number"
            min={0}
            max={5}
            value={currentOctave}
            onChange={(e) => onOctaveChange(Math.max(0, Math.min(5, Number(e.target.value))))}
            className={`w-12 px-1 py-0.5 border text-center font-mono font-bold text-xs ${
              isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-zinc-900 border-zinc-700 text-white'
            }`}
          />
        </div>

        {/* Instrument Selector */}
        <div className="flex items-center gap-1 text-xs">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Instrument</span>
          <select
            value={currentInstrument}
            onChange={(e) => onInstrumentChange(Number(e.target.value))}
            className={`px-2 py-0.5 border text-xs font-mono font-bold ${
              isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-zinc-900 border-zinc-700 text-white'
            }`}
          >
            <option value={0}>0 - (no instrument)</option>
            {Array.from({ length: 15 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {(i + 1).toString(16).toUpperCase()} - Instrument {i + 1}
              </option>
            ))}
          </select>
        </div>

        {/* Step Spinner */}
        <div className="flex items-center gap-1 text-xs">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Step</span>
          <input
            type="number"
            min={0}
            max={16}
            value={currentStep}
            onChange={(e) => onStepChange(Math.max(0, Math.min(16, Number(e.target.value))))}
            className={`w-12 px-1 py-0.5 border text-center font-mono font-bold text-xs ${
              isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-zinc-900 border-zinc-700 text-white'
            }`}
          />
        </div>

        {/* Right side: Theme toggle, Options shortcut & PWA */}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={onToggleColorTheme}
            className="flex items-center gap-1 px-2 py-0.5 bevel-button hover:bg-white text-black text-xs font-semibold"
            title={`Toggle Theme (Current: ${isLight ? 'Light' : 'Dark'})`}
          >
            {isLight ? <Moon className="w-3.5 h-3.5 text-slate-700" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
            <span>{isLight ? 'Dark' : 'Light'}</span>
          </button>
          <button
            onClick={() => setOptionsModalOpen(true)}
            className="px-2 py-0.5 bevel-button hover:bg-white text-black text-xs font-semibold"
            title="Open Options Dialog"
          >
            Options...
          </button>
          <PWAInstallButton />
        </div>
      </div>

      {/* Real-time Oscilloscope Banner matching Screenshot 1 (toggleable via options) */}
      {options.showScopes && (
        <div className="grid grid-cols-4 gap-1 p-1 bg-black border-b border-zinc-800 shrink-0 h-14">
          {[0, 1, 2, 3].map((ch) => (
            <div key={ch} className="relative w-full h-full bg-[#05110a] border border-[#163820] overflow-hidden">
              <canvas
                ref={(el) => {
                  oscCanvasesRef.current[ch] = el;
                }}
                width={240}
                height={50}
                className="w-full h-full block"
              />
              <div className="absolute top-0.5 left-1 text-[9px] font-mono font-bold text-emerald-400/90 pointer-events-none drop-shadow">
                {ch === 0
                  ? `CH1 DUTY (${['12.5%', '25%', '50%', '75%'][(audioEngine.apu?.regs[1] >> 6) & 3] || '50%'})`
                  : ch === 1
                  ? `CH2 DUTY (${['12.5%', '25%', '50%', '75%'][(audioEngine.apu?.regs[6] >> 6) & 3] || '50%'})`
                  : ch === 2
                  ? 'CH3 WAVE (32 SAMPLES)'
                  : 'CH4 NOISE (LFSR)'}
              </div>
              {mutedChannels[ch] && (
                <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center text-red-200 text-[10px] font-bold">
                  MUTED
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Main Workspace Area: Left TreeView + Center PageControl Tabs */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side TreeView: Instruments / Waves / Routines (Adjustable Width - Image 2) */}
        <div
          style={{ width: `${sidebarWidth}px` }}
          className={`border-r flex flex-col shrink-0 text-xs select-none ${
            isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-800 text-zinc-300'
          }`}
        >
          <div
            className={`p-1.5 font-bold border-b text-[11px] ${
              isLight ? 'bg-[#ece9d8] border-[#abb7bc]' : 'bg-[#22222a] border-zinc-800'
            }`}
          >
            Instruments
          </div>
          <div className="flex-1 overflow-y-auto p-1 font-mono text-[11px] flex flex-col gap-0.5">
            {/* Duty Instruments Group */}
            <div>
              <div
                onClick={() => setTreeExpanded((p) => ({ ...p, duty: !p.duty }))}
                className="flex items-center gap-1 cursor-pointer font-bold px-1 py-0.5 hover:bg-blue-100 dark:hover:bg-zinc-800"
              >
                <span>{treeExpanded.duty ? '▼' : '▶'}</span>
                <span>Duty</span>
              </div>
              {treeExpanded.duty && (
                <div className="pl-4 flex flex-col">
                  {song.dutyInstruments.map((inst, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedInstType(0);
                        setSelectedInstIndex(i);
                        setActiveMainTab('Instruments');
                      }}
                      className={`px-1 py-0.5 cursor-pointer truncate ${
                        activeMainTab === 'Instruments' && selectedInstType === 0 && selectedInstIndex === i
                          ? 'bg-[#316ac5] text-white font-bold'
                          : 'hover:bg-blue-50 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      {i + 1}: {inst.name || 'Blank'}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Wave Instruments Group */}
            <div>
              <div
                onClick={() => setTreeExpanded((p) => ({ ...p, wave: !p.wave }))}
                className="flex items-center gap-1 cursor-pointer font-bold px-1 py-0.5 hover:bg-blue-100 dark:hover:bg-zinc-800"
              >
                <span>{treeExpanded.wave ? '▼' : '▶'}</span>
                <span>Wave</span>
              </div>
              {treeExpanded.wave && (
                <div className="pl-4 flex flex-col">
                  {song.waveInstruments.map((inst, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedInstType(1);
                        setSelectedInstIndex(i);
                        setActiveMainTab('Instruments');
                      }}
                      className={`px-1 py-0.5 cursor-pointer truncate ${
                        activeMainTab === 'Instruments' && selectedInstType === 1 && selectedInstIndex === i
                          ? 'bg-[#316ac5] text-white font-bold'
                          : 'hover:bg-blue-50 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      {i + 1}: {inst.name || 'Blank'}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Noise Instruments Group */}
            <div>
              <div
                onClick={() => setTreeExpanded((p) => ({ ...p, noise: !p.noise }))}
                className="flex items-center gap-1 cursor-pointer font-bold px-1 py-0.5 hover:bg-blue-100 dark:hover:bg-zinc-800"
              >
                <span>{treeExpanded.noise ? '▼' : '▶'}</span>
                <span>Noise</span>
              </div>
              {treeExpanded.noise && (
                <div className="pl-4 flex flex-col">
                  {song.noiseInstruments.map((inst, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedInstType(2);
                        setSelectedInstIndex(i);
                        setActiveMainTab('Instruments');
                      }}
                      className={`px-1 py-0.5 cursor-pointer truncate ${
                        activeMainTab === 'Instruments' && selectedInstType === 2 && selectedInstIndex === i
                          ? 'bg-[#316ac5] text-white font-bold'
                          : 'hover:bg-blue-50 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      {i + 1}: {inst.name || 'Blank'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resizer Splitter Handle (Drag to adjust sidebar width) */}
        <div
          onMouseDown={handleSidebarResizeStart}
          className={`w-1.5 hover:w-2 -ml-0.5 cursor-col-resize shrink-0 select-none z-20 flex items-center justify-center transition-colors ${
            isResizingSidebar
              ? 'bg-[#316ac5]'
              : isLight
              ? 'bg-[#d0ccc0] hover:bg-[#316ac5]'
              : 'bg-zinc-700 hover:bg-blue-500'
          }`}
          title="Drag to resize instrument sidebar"
        >
          <div className="w-0.5 h-6 bg-gray-400 dark:bg-zinc-500 rounded-full pointer-events-none" />
        </div>

        {/* Center PageControl Container (Supports horizontal or vertical tabs) */}
        <div className={`flex-1 flex ${options.tabsVertical ? 'flex-row' : 'flex-col'} overflow-hidden`}>
          {/* Main Tab Navigation Bar */}
          <div
            className={`flex ${
              options.tabsVertical
                ? 'flex-col border-r w-28 p-1 gap-1 shrink-0'
                : 'flex-row items-center px-2 pt-1 border-b gap-1 shrink-0'
            } text-xs ${isLight ? 'bg-[#ece9d8] border-[#abb7bc]' : 'bg-[#22222a] border-zinc-800'}`}
          >
            {(['General', 'Patterns', 'Instruments', 'Waves', 'Comments', 'Routines'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveMainTab(tab)}
                className={`px-3 py-1 font-semibold transition text-xs ${
                  options.tabsVertical
                    ? activeMainTab === tab
                      ? isLight
                        ? 'bg-white border border-[#abb7bc] text-black font-bold shadow-xs rounded-[3px] text-left'
                        : 'bg-[#181820] border border-zinc-700 text-white font-bold rounded-[3px] text-left'
                      : isLight
                      ? 'bg-transparent text-gray-700 hover:bg-white/60 text-left'
                      : 'bg-transparent text-zinc-400 hover:text-white text-left'
                    : activeMainTab === tab
                    ? isLight
                      ? 'bg-white border-t border-l border-r border-[#abb7bc] text-black font-bold -mb-px pb-1.5 rounded-t-[3px]'
                      : 'bg-[#181820] border-t border-l border-r border-zinc-700 text-white font-bold -mb-px pb-1.5 rounded-t-[3px]'
                    : isLight
                    ? 'bg-[#e0ded0] border-transparent text-gray-700 hover:bg-white/60 rounded-t-[3px]'
                    : 'bg-[#2a2a34] border-transparent text-zinc-400 hover:text-white rounded-t-[3px]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ========================================================= */}
          {/* TAB 1: General (Song Information - matching Screenshot 4) */}
          {/* ========================================================= */}
          {activeMainTab === 'General' && (
            <div className={`flex-1 p-4 overflow-y-auto ${isLight ? 'bg-white' : 'bg-[#181820]'}`}>
              {/* Song information GroupBox */}
              <fieldset
                className={`border p-4 rounded-[3px] max-w-lg ${
                  isLight ? 'border-[#7f9db9] bg-[#fafafa]' : 'border-zinc-700 bg-[#20202a]'
                }`}
              >
                <legend className="px-1.5 text-xs font-bold text-gray-800 dark:text-gray-200">
                  Song information
                </legend>

                <div className="flex flex-col gap-3 text-xs">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">Song</label>
                    <input
                      type="text"
                      value={song.name}
                      onChange={(e) => onUpdateSong({ name: e.target.value })}
                      className={`border px-2 py-1 text-xs rounded-[2px] ${
                        isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                      }`}
                      placeholder="Blank"
                    />
                  </div>

                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">Artist</label>
                    <input
                      type="text"
                      value={song.artist}
                      onChange={(e) => onUpdateSong({ artist: e.target.value })}
                      className={`border px-2 py-1 text-xs rounded-[2px] ${
                        isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                      }`}
                      placeholder="Blank"
                    />
                  </div>

                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">Tempo (ticks per row)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        max={32}
                        value={song.ticksPerRow}
                        onChange={(e) => onUpdateSong({ ticksPerRow: Math.max(1, Number(e.target.value)) })}
                        className={`w-16 border px-2 py-1 text-center font-mono font-bold rounded-[2px] ${
                          isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">Tempo (timer divider)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        max={255}
                        value={song.timerDivider}
                        onChange={(e) => onUpdateSong({ timerDivider: Math.max(0, Math.min(255, Number(e.target.value))) })}
                        className={`w-16 border px-2 py-1 text-center font-mono font-bold rounded-[2px] ${
                          isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                        }`}
                      />
                      <span className="font-mono text-gray-600 dark:text-gray-400 font-bold">
                        ~
                        {(
                          (4194304 / (256 * (256 - song.timerDivider) * (song.ticksPerRow || 6) * 4)) *
                          60
                        ).toFixed(2)}{' '}
                        BPM
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-[140px_1fr] items-center gap-2 pt-1">
                    <span />
                    <label className="flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={song.timerEnabled}
                        onChange={(e) => onUpdateSong({ timerEnabled: e.target.checked })}
                        className="rounded"
                      />
                      <span>Enable timer-based tempo</span>
                    </label>
                  </div>
                </div>
              </fieldset>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: Patterns (Order Matrix + Grid - authentic desktop tracker layout) */}
          {/* ========================================================= */}
          {activeMainTab === 'Patterns' && (
            <div className={`flex-1 flex overflow-hidden p-2 gap-2 ${isLight ? 'bg-[#ece9d8]' : 'bg-[#181820]'}`}>
              {/* Order Matrix (Left side) */}
              <div
                className={`w-44 border flex flex-col shrink-0 select-none shadow-xs rounded-[2px] ${
                  isLight ? 'bg-white border-[#7f9db9]' : 'bg-[#15151c] border-zinc-700'
                }`}
              >
                {/* Order Table Header */}
                <div
                  className={`grid grid-cols-[28px_1fr_1fr_1fr_1fr] text-[11px] font-bold border-b text-center py-1 ${
                    isLight ? 'bg-[#ece9d8] border-[#abb7bc] text-gray-800' : 'bg-[#22222a] border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div>#</div>
                  <div>D1</div>
                  <div>D2</div>
                  <div>Wv</div>
                  <div>Ns</div>
                </div>

                {/* Order Rows */}
                <div className="flex-1 overflow-y-auto font-mono text-[11px]">
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
                      const isSelected = activeOrd === ordIdx;
                      return (
                        <div
                          key={ordIdx}
                          onClick={() => onSelectOrder(ordIdx)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSelectOrder(ordIdx);
                            setTrackerContextMenu(null);
                            setOrderContextMenu({
                              isOpen: true,
                              x: Math.min(e.clientX, window.innerWidth - 180),
                              y: Math.min(e.clientY, window.innerHeight - 200),
                              orderIndex: ordIdx,
                            });
                          }}
                          className={`grid grid-cols-[28px_1fr_1fr_1fr_1fr] text-center border-b cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#316ac5] text-white font-bold'
                              : isLight
                              ? 'border-gray-200 hover:bg-blue-50 text-black'
                              : 'border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          <div className={`border-r font-sans text-[10px] ${isSelected ? 'text-white font-bold' : 'text-gray-500'}`}>
                            {options.hexOrderRows ? (ordIdx + 1).toString(16).toUpperCase().padStart(2, '0') : ordIdx + 1}
                          </div>
                          {[0, 1, 2, 3].map((ch) => {
                            const patIdx = song.orderMatrix[ch]?.[ordIdx] ?? 0;
                            return (
                              <div
                                key={ch}
                                onDoubleClick={() => {
                                  const nextPat = prompt(`Pattern for Channel ${ch + 1}, Order ${ordIdx + 1}:`, patIdx.toString());
                                  if (nextPat !== null && !isNaN(Number(nextPat))) {
                                    onUpdateOrderCell(ch, ordIdx, Math.max(0, Number(nextPat)));
                                  }
                                }}
                                className="border-r last:border-r-0 py-0.5"
                              >
                                {patIdx}
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                  )}
                </div>

                {/* Order Control Buttons */}
                <div
                  className={`p-1 border-t flex items-center justify-between text-xs gap-1 ${
                    isLight ? 'bg-[#ece9d8] border-[#abb7bc]' : 'bg-[#22222a] border-zinc-700'
                  }`}
                >
                  <button
                    onClick={() => onInsertOrder(currentOrder + 1, false)}
                    className="flex-1 py-0.5 bevel-button font-bold text-xs text-black hover:bg-white text-center"
                    title="Insert New Order (Ins)"
                  >
                    + Add
                  </button>
                  <button
                    onClick={() => onInsertOrder(currentOrder + 1, true)}
                    className="flex-1 py-0.5 bevel-button font-bold text-xs text-black hover:bg-white text-center"
                    title="Clone Selected Order"
                  >
                    Clone
                  </button>
                  <button
                    onClick={() => onDeleteOrder(currentOrder)}
                    className="flex-1 py-0.5 bevel-button text-red-600 font-bold text-xs hover:bg-white text-center"
                    title="Delete Order (Del)"
                  >
                    Del
                  </button>
                </div>
              </div>

              {/* 4-Channel Tracker Grid Container - Fixed Width 580px matching classic desktop tracker */}
              <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-start">
                <div
                  ref={gridContainerRef}
                  tabIndex={0}
                  onKeyDown={handleGridKeyDown}
                  className={`w-[580px] shrink-0 h-full flex flex-col border rounded-[2px] shadow-xs focus:outline-none select-none font-mono ${
                    isLight ? 'bg-[#ece7db] border-[#7f9db9] text-black' : 'bg-[#121217] border-zinc-700 text-zinc-100'
                  }`}
                >
                  {/* Column Headers with Speaker Mute/Solo Icons */}
                  <div
                    className={`grid grid-cols-[34px_136px_136px_136px_136px] text-xs font-bold border-b shrink-0 ${
                      isLight ? 'bg-[#ece9d8] border-[#abb7bc] text-black' : 'bg-[#202028] border-zinc-700 text-zinc-200'
                    }`}
                  >
                    <div className="py-1 text-center border-r text-[10px] text-gray-500">Row</div>
                    {['Duty 1', 'Duty 2', 'Wave', 'Noise'].map((chName, ch) => (
                      <div key={ch} className="py-1 px-1.5 border-r last:border-r-0 flex items-center justify-between">
                        <span className="truncate">{chName}</span>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSolo(ch);
                            }}
                            title={soloChannels[ch] ? 'Unsolo Channel' : 'Solo Channel'}
                            className={`px-1 text-[9px] font-bold rounded-[2px] ${
                              soloChannels[ch] ? 'bg-amber-500 text-white' : 'hover:bg-black/10 text-gray-500'
                            }`}
                          >
                            S
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleMute(ch);
                            }}
                            title={mutedChannels[ch] ? 'Unmute Channel' : 'Mute Channel'}
                            className="hover:opacity-80 p-0.5"
                          >
                            {mutedChannels[ch] ? (
                              <VolumeX className="w-3.5 h-3.5 text-red-600" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5 text-gray-600 dark:text-zinc-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 64 Tracker Rows Scroll Area */}
                  <div className="flex-1 overflow-y-auto">
                    {Array.from({ length: 64 }, (_, r) => {
                      const isBarRow = r % 16 === 0;
                      const isBeatRow = r % 4 === 0 && !isBarRow;
                      const isCursorRow = cursorRow === r;
                      const isPlaying = playbackState.isPlaying && playbackState.row === r;

                      // Authentic Lazarus LCL row background colors
                      const rowBg = isPlaying
                        ? isLight
                          ? 'bg-[#ffea88]'
                          : 'bg-[#064e3b]'
                        : isBarRow
                        ? isLight
                          ? 'bg-[#bda88c]'
                          : 'bg-[#2f2720]'
                        : isBeatRow
                        ? isLight
                          ? 'bg-[#dbd3c5]'
                          : 'bg-[#22222d]'
                        : isLight
                        ? 'bg-[#ece7db]'
                        : 'bg-[#15151c]';

                      return (
                        <div
                          key={r}
                          data-row-index={r}
                          className={`grid grid-cols-[34px_136px_136px_136px_136px] border-b border-black/5 dark:border-white/5 text-[11px] leading-tight ${rowBg}`}
                        >
                          {/* Row Index label */}
                          <div
                            className={`text-center py-0.5 border-r font-bold ${
                              isBarRow
                                ? isLight
                                  ? 'text-red-900 bg-[#b29d81]'
                                  : 'text-amber-400 bg-[#3a3026]'
                                : isLight
                                ? 'text-gray-700'
                                : 'text-zinc-500'
                            }`}
                          >
                            {options.hexPatternRows
                              ? r.toString(16).toUpperCase().padStart(2, '0')
                              : r.toString().padStart(2, '0')}
                          </div>

                          {/* 4 Channels */}
                          {[0, 1, 2, 3].map((ch) => {
                            const patIdx = song.orderMatrix[ch]?.[activeOrd] ?? 0;
                            const cell = song.patterns[patIdx]?.[r] || {
                              note: NO_NOTE,
                              instrument: 0,
                              volume: 0,
                              effectCode: 0,
                              effectParams: 0,
                            };

                            const isCellInSelection =
                              selectionBounds?.isMulti &&
                              r >= selectionBounds.minRow &&
                              r <= selectionBounds.maxRow &&
                              ch >= selectionBounds.minCh &&
                              ch <= selectionBounds.maxCh;

                            const isCursorHere = cursorRow === r && cursorChannel === ch;
                            const isCellSelected = isCursorHere || isCellInSelection;
                            const isRowHighlighted = isCursorRow && !isCellSelected;

                            const noteStr =
                              cell.note !== undefined && cell.note !== NO_NOTE && cell.note < 72
                                ? NOTE_NAMES[cell.note]
                                : '...';
                            const instStr = cell.instrument > 0 ? cell.instrument.toString(16).toUpperCase().padStart(2, '0') : '..';
                            const volStr = cell.volume > 0 ? `v${cell.volume.toString(16).toUpperCase()}` : '...';
                            const effCodeStr = cell.effectCode > 0 ? cell.effectCode.toString(16).toUpperCase() : '.';
                            const effParamStr =
                              cell.effectCode > 0 || cell.effectParams > 0
                                ? cell.effectParams.toString(16).toUpperCase().padStart(2, '0')
                                : '..';

                            return (
                              <div
                                key={ch}
                                onMouseDown={(e) => {
                                  if (e.button === 0) {
                                    setIsSelecting(true);
                                    setSelection({
                                      startRow: r,
                                      startCh: ch,
                                      endRow: r,
                                      endCh: ch,
                                    });
                                    onCursorChange(r, ch, cursorColumn);
                                  }
                                }}
                                onMouseEnter={() => {
                                  if (isSelecting) {
                                    setSelection((prev) => {
                                      if (!prev) return { startRow: r, startCh: ch, endRow: r, endCh: ch };
                                      return { ...prev, endRow: r, endCh: ch };
                                    });
                                  }
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onCursorChange(r, ch, cursorColumn);
                                  setOrderContextMenu(null);
                                  setTrackerContextMenu({
                                    isOpen: true,
                                    x: Math.min(e.clientX, window.innerWidth - 220),
                                    y: Math.min(e.clientY, window.innerHeight - 360),
                                    channel: ch,
                                    row: r,
                                  });
                                }}
                                className={`border-r last:border-r-0 px-1.5 py-0.5 flex items-center justify-between font-mono cursor-pointer select-none transition-colors ${
                                  isCellSelected
                                    ? isLight
                                      ? 'bg-[#316ac5] text-white font-bold shadow-inner'
                                      : 'bg-[#2563eb] text-white font-bold'
                                    : isRowHighlighted
                                    ? isLight
                                      ? 'bg-[#d7e5f3]/80'
                                      : 'bg-blue-950/40'
                                    : ''
                                }`}
                              >
                                {/* Note Column */}
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCursorChange(r, ch, 0);
                                  }}
                                  className={`cursor-pointer ${
                                    isCellSelected && cursorColumn === 0
                                      ? 'underline font-black'
                                      : isCellSelected
                                      ? 'text-white'
                                      : cell.note !== NO_NOTE
                                      ? isLight
                                        ? 'text-[#002b66] font-bold'
                                        : 'text-amber-300 font-bold'
                                      : isLight
                                      ? 'text-gray-400'
                                      : 'text-zinc-600'
                                  }`}
                                >
                                  {noteStr}
                                </span>

                                {/* Instrument Column */}
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCursorChange(r, ch, 1);
                                  }}
                                  className={`cursor-pointer ${
                                    isCellSelected && cursorColumn === 1
                                      ? 'underline font-black'
                                      : isCellSelected
                                      ? 'text-white'
                                      : cell.instrument > 0
                                      ? isLight
                                        ? 'text-[#770000] font-bold'
                                        : 'text-emerald-400 font-bold'
                                      : isLight
                                      ? 'text-gray-400'
                                      : 'text-zinc-600'
                                  }`}
                                >
                                  {instStr}
                                </span>

                                {/* Volume Column */}
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCursorChange(r, ch, 2);
                                  }}
                                  className={`cursor-pointer ${
                                    isCellSelected && cursorColumn === 2
                                      ? 'underline font-black'
                                      : isCellSelected
                                      ? 'text-white'
                                      : cell.volume > 0
                                      ? isLight
                                        ? 'text-[#005500] font-bold'
                                        : 'text-cyan-400 font-bold'
                                      : isLight
                                      ? 'text-gray-400'
                                      : 'text-zinc-600'
                                  }`}
                                >
                                  {volStr}
                                </span>

                                {/* Effect Column */}
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCursorChange(r, ch, 3);
                                  }}
                                  className={`cursor-pointer ${
                                    isCellSelected && (cursorColumn === 3 || cursorColumn === 4)
                                      ? 'underline font-black text-white'
                                      : isCellSelected
                                      ? 'text-white'
                                      : getEffectColor(cell.effectCode, isLight)
                                  }`}
                                >
                                  {effCodeStr}
                                  {effParamStr}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: Instruments (with Subpattern Grid - matching Screenshot 2) */}
          {/* ========================================================= */}
          {activeMainTab === 'Instruments' && (
            <div
              className={`flex-1 p-3 overflow-y-auto flex gap-3 ${
                isLight ? 'bg-white' : 'bg-[#181820]'
              }`}
            >
              {/* Left & Middle Column: Instrument, Envelope, and Square/Wave/Noise Parameter Boxes */}
              <div className="flex-1 flex flex-col gap-3 min-w-[500px]">
                {/* 3 Parameter GroupBoxes side-by-side */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* GroupBox 1: Instrument */}
                  <fieldset
                    className={`border p-2.5 rounded-[3px] flex flex-col gap-2 ${
                      isLight ? 'border-[#7f9db9] bg-[#fafafa]' : 'border-zinc-700 bg-[#20202a]'
                    }`}
                  >
                    <legend className="px-1 text-xs font-bold text-gray-800 dark:text-gray-200">
                      Instrument
                    </legend>

                    {/* Channel */}
                    <div className="grid grid-cols-[80px_1fr] items-center gap-1 text-xs">
                      <label className="font-semibold text-gray-700 dark:text-gray-300">Channel</label>
                      <select
                        value={selectedInstType}
                        onChange={(e) => setSelectedInstType(Number(e.target.value) as 0 | 1 | 2)}
                        className={`border px-1.5 py-0.5 text-xs rounded-[2px] font-semibold ${
                          isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                        }`}
                      >
                        <option value={0}>Square</option>
                        <option value={1}>Wave</option>
                        <option value={2}>Noise</option>
                      </select>
                    </div>

                    {/* Instrument Index */}
                    <div className="grid grid-cols-[80px_1fr] items-center gap-1 text-xs">
                      <label className="font-semibold text-gray-700 dark:text-gray-300">Instrument</label>
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={selectedInstIndex + 1}
                        onChange={(e) => {
                          const idx = Math.max(0, Math.min(14, Number(e.target.value) - 1));
                          setSelectedInstIndex(idx);
                          onInstrumentChange(idx + 1);
                        }}
                        className={`w-16 border px-1.5 py-0.5 text-center font-mono font-bold text-xs rounded-[2px] ${
                          isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                        }`}
                      />
                    </div>

                    {/* Name */}
                    <div className="grid grid-cols-[80px_1fr] items-center gap-1 text-xs">
                      <label className="font-semibold text-gray-700 dark:text-gray-300">Name</label>
                      <input
                        type="text"
                        value={currentInst?.name || ''}
                        onChange={(e) => {
                          if (selectedInstType === 0) onUpdateDutyInstrument(selectedInstIndex, { name: e.target.value });
                          else if (selectedInstType === 1) onUpdateWaveInstrument(selectedInstIndex, { name: e.target.value });
                          else onUpdateNoiseInstrument(selectedInstIndex, { name: e.target.value });
                        }}
                        className={`border px-1.5 py-0.5 text-xs rounded-[2px] ${
                          isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                        }`}
                      />
                    </div>

                    {/* Length Checkbox & Slider */}
                    <div className="flex items-center gap-2 text-xs pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                        <input
                          type="checkbox"
                          checked={currentInst?.lengthEnabled || false}
                          onChange={(e) => {
                            const val = e.target.checked;
                            if (selectedInstType === 0) onUpdateDutyInstrument(selectedInstIndex, { lengthEnabled: val });
                            else if (selectedInstType === 1) onUpdateWaveInstrument(selectedInstIndex, { lengthEnabled: val });
                            else onUpdateNoiseInstrument(selectedInstIndex, { lengthEnabled: val });
                          }}
                        />
                        <span>Length</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={selectedInstType === 1 ? 255 : 63}
                        value={currentInst?.length || 0}
                        disabled={!currentInst?.lengthEnabled}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (selectedInstType === 0) onUpdateDutyInstrument(selectedInstIndex, { length: val });
                          else if (selectedInstType === 1) onUpdateWaveInstrument(selectedInstIndex, { length: val });
                          else onUpdateNoiseInstrument(selectedInstIndex, { length: val });
                        }}
                        className="flex-1 h-1.5 bg-gray-300 rounded cursor-pointer"
                      />
                    </div>

                    {/* Test Octave Buttons */}
                    <div className="flex items-center gap-1 text-xs pt-1">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">Test octave:</span>
                      {[3, 4, 5, 6, 7, 8].map((oct) => (
                        <button
                          key={oct}
                          onClick={() => {
                            const noteVal = (oct - 3) * 12;
                            onPreviewNote(selectedInstType === 0 ? 0 : selectedInstType === 1 ? 2 : 3, noteVal, selectedInstIndex + 1);
                          }}
                          className="px-1.5 py-0.5 bevel-button text-xs font-bold text-black hover:bg-white"
                        >
                          {oct}
                        </button>
                      ))}
                    </div>

                    {/* Enable Subpattern Checkbox */}
                    <div className="pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-blue-700 dark:text-blue-400">
                        <input
                          type="checkbox"
                          checked={currentInst?.subpatternEnabled || false}
                          onChange={(e) => {
                            const val = e.target.checked;
                            if (selectedInstType === 0) onUpdateDutyInstrument(selectedInstIndex, { subpatternEnabled: val });
                            else if (selectedInstType === 1) onUpdateWaveInstrument(selectedInstIndex, { subpatternEnabled: val });
                            else onUpdateNoiseInstrument(selectedInstIndex, { subpatternEnabled: val });
                          }}
                        />
                        <span>Enable subpattern</span>
                      </label>
                    </div>
                  </fieldset>

                  {/* GroupBox 2: Envelope */}
                  <fieldset
                    className={`border p-2.5 rounded-[3px] flex flex-col gap-2 ${
                      isLight ? 'border-[#7f9db9] bg-[#fafafa]' : 'border-zinc-700 bg-[#20202a]'
                    }`}
                  >
                    <legend className="px-1 text-xs font-bold text-gray-800 dark:text-gray-200">
                      Envelope
                    </legend>

                    {/* Start vol. slider */}
                    <div className="grid grid-cols-[70px_1fr] items-center gap-2 text-xs">
                      <label className="font-semibold text-gray-700 dark:text-gray-300">Start vol.</label>
                      <input
                        type="range"
                        min={0}
                        max={15}
                        value={selectedInstType === 1 ? 15 : (dutyInst.initialVolume ?? 15)}
                        disabled={selectedInstType === 1}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (selectedInstType === 0) onUpdateDutyInstrument(selectedInstIndex, { initialVolume: val });
                          else if (selectedInstType === 2) onUpdateNoiseInstrument(selectedInstIndex, { initialVolume: val });
                        }}
                        className="flex-1 h-1.5 bg-gray-300 rounded cursor-pointer"
                      />
                    </div>

                    {/* Direction */}
                    <div className="grid grid-cols-[70px_1fr] items-center gap-2 text-xs">
                      <label className="font-semibold text-gray-700 dark:text-gray-300">Direction</label>
                      <select
                        value={dutyInst.volSweepDirection ?? 1}
                        disabled={selectedInstType === 1}
                        onChange={(e) => {
                          const val = Number(e.target.value) as 0 | 1;
                          if (selectedInstType === 0) onUpdateDutyInstrument(selectedInstIndex, { volSweepDirection: val });
                          else if (selectedInstType === 2) onUpdateNoiseInstrument(selectedInstIndex, { volSweepDirection: val });
                        }}
                        className={`border px-1.5 py-0.5 text-xs rounded-[2px] ${
                          isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                        }`}
                      >
                        <option value={1}>Down</option>
                        <option value={0}>Up</option>
                      </select>
                    </div>

                    {/* Change / Amount slider */}
                    <div className="grid grid-cols-[70px_1fr] items-center gap-2 text-xs">
                      <label className="font-semibold text-gray-700 dark:text-gray-300">Change</label>
                      <input
                        type="range"
                        min={0}
                        max={7}
                        value={dutyInst.volSweepAmount ?? 0}
                        disabled={selectedInstType === 1}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (selectedInstType === 0) onUpdateDutyInstrument(selectedInstIndex, { volSweepAmount: val });
                          else if (selectedInstType === 2) onUpdateNoiseInstrument(selectedInstIndex, { volSweepAmount: val });
                        }}
                        className="flex-1 h-1.5 bg-gray-300 rounded cursor-pointer"
                      />
                    </div>

                    {/* Mini Oscilloscope / Envelope Preview Box */}
                    <div className="h-16 bg-[#081808] border border-[#163820] rounded-[2px] overflow-hidden flex flex-col p-1.5 mt-auto relative select-none">
                      {selectedInstType === 1 ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center">
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">
                            WAVE #{waveInst.waveform ?? 0}
                          </span>
                          <span className="text-[9px] font-mono text-emerald-600">
                            {['Muted', '100% Vol', '50% Vol', '25% Vol'][waveInst.outputLevel ?? 1]} · Fixed Vol
                          </span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col justify-between">
                          <div className="flex justify-between items-center text-[9px] font-mono">
                            <span className="text-emerald-400 font-bold">
                              {selectedInstType === 0
                                ? `DUTY ${dutyInst.duty === 0 ? '12.5%' : dutyInst.duty === 1 ? '25%' : dutyInst.duty === 2 ? '50%' : '75%'}`
                                : `NOISE ${noiseInst.counterStep === 0 ? '15-BIT' : '7-BIT'}`}
                            </span>
                            <span className="text-emerald-600">
                              V:{selectedInstType === 0 ? dutyInst.initialVolume ?? 15 : noiseInst.initialVolume ?? 15}{' '}
                              S:{(selectedInstType === 0 ? dutyInst.volSweepAmount : noiseInst.volSweepAmount) ?? 0}
                            </span>
                          </div>
                          {/* Envelope Curve SVG */}
                          <div className="w-full h-8 relative">
                            <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
                              {/* Center grid line */}
                              <line x1="0" y1="12" x2="100" y2="12" stroke="#163820" strokeDasharray="2,2" strokeWidth="0.8" />
                              {(() => {
                                const initVol = (selectedInstType === 0 ? dutyInst.initialVolume : noiseInst.initialVolume) ?? 15;
                                const dir = (selectedInstType === 0 ? dutyInst.volSweepDirection : noiseInst.volSweepDirection) ?? 1; // 1 = down, 0 = up
                                const sweep = (selectedInstType === 0 ? dutyInst.volSweepAmount : noiseInst.volSweepAmount) ?? 0;
                                const hasLen = (selectedInstType === 0 ? dutyInst.lengthEnabled : noiseInst.lengthEnabled);
                                const lenVal = (selectedInstType === 0 ? dutyInst.length : noiseInst.length) ?? 0;
                                const cutX = hasLen ? Math.max(10, Math.min(95, ((64 - lenVal) / 64) * 100)) : 100;

                                const yStart = 22 - (initVol / 15) * 20;
                                let yEnd = yStart;
                                let xEnd = 100;

                                if (sweep > 0) {
                                  // Sweep slope: faster sweep when sweep number is lower (Gameboy APU envelope step time is sweep * (1/64)s)
                                  const durationFactor = (sweep / 7) * 70;
                                  if (dir === 1) { // Down
                                    xEnd = Math.min(100, Math.max(15, durationFactor));
                                    yEnd = 22;
                                  } else { // Up
                                    xEnd = Math.min(100, Math.max(15, durationFactor));
                                    yEnd = 2;
                                  }
                                }

                                const points: string[] = [];
                                points.push(`0,${yStart}`);
                                if (sweep === 0) {
                                  points.push(`${cutX},${yStart}`);
                                } else {
                                  if (cutX < xEnd) {
                                    const yAtCut = yStart + ((yEnd - yStart) * (cutX / xEnd));
                                    points.push(`${cutX},${yAtCut}`);
                                  } else {
                                    points.push(`${xEnd},${yEnd}`);
                                    points.push(`${cutX},${yEnd}`);
                                  }
                                }
                                if (hasLen) {
                                  points.push(`${cutX},23`);
                                  points.push(`100,23`);
                                }

                                return (
                                  <>
                                    <polyline
                                      fill="none"
                                      stroke="#8bac0f"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      points={points.join(' ')}
                                    />
                                    {hasLen && (
                                      <line
                                        x1={cutX}
                                        y1="0"
                                        x2={cutX}
                                        y2="24"
                                        stroke="#f43f5e"
                                        strokeWidth="1.2"
                                        strokeDasharray="2,1"
                                      />
                                    )}
                                  </>
                                );
                              })()}
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </fieldset>

                  {/* GroupBox 3: Square / Wave / Noise specifics */}
                  <fieldset
                    className={`border p-2.5 rounded-[3px] flex flex-col gap-2 ${
                      isLight ? 'border-[#7f9db9] bg-[#fafafa]' : 'border-zinc-700 bg-[#20202a]'
                    }`}
                  >
                    <legend className="px-1 text-xs font-bold text-gray-800 dark:text-gray-200">
                      {selectedInstType === 0 ? 'Square' : selectedInstType === 1 ? 'Wave' : 'Noise'}
                    </legend>

                    {selectedInstType === 0 && (
                      <>
                        <div className="grid grid-cols-[90px_1fr] items-center gap-1 text-xs">
                          <label className="font-semibold text-gray-700 dark:text-gray-300">Sweep time</label>
                          <select
                            value={dutyInst.sweepTime ?? 0}
                            onChange={(e) => onUpdateDutyInstrument(selectedInstIndex, { sweepTime: Number(e.target.value) })}
                            className={`border px-1 py-0.5 text-xs rounded-[2px] ${
                              isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                            }`}
                          >
                            <option value={0}>Off - no frequency change</option>
                            <option value={1}>1 - 15.6ms</option>
                            <option value={2}>2 - 31.3ms</option>
                            <option value={3}>3 - 46.9ms</option>
                            <option value={4}>4 - 62.5ms</option>
                            <option value={5}>5 - 78.1ms</option>
                            <option value={6}>6 - 93.8ms</option>
                            <option value={7}>7 - 109.4ms</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-[90px_1fr] items-center gap-1 text-xs">
                          <label className="font-semibold text-gray-700 dark:text-gray-300">Sweep direction</label>
                          <select
                            value={dutyInst.sweepIncDec ?? 0}
                            onChange={(e) => onUpdateDutyInstrument(selectedInstIndex, { sweepIncDec: Number(e.target.value) as 0 | 1 })}
                            className={`border px-1 py-0.5 text-xs rounded-[2px] ${
                              isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                            }`}
                          >
                            <option value={0}>Up</option>
                            <option value={1}>Down</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-[90px_1fr] items-center gap-1 text-xs">
                          <label className="font-semibold text-gray-700 dark:text-gray-300">Sweep size</label>
                          <input
                            type="range"
                            min={0}
                            max={7}
                            value={dutyInst.sweepShift ?? 0}
                            onChange={(e) => onUpdateDutyInstrument(selectedInstIndex, { sweepShift: Number(e.target.value) })}
                            className="flex-1 h-1.5 bg-gray-300 rounded cursor-pointer"
                          />
                        </div>

                        <div className="grid grid-cols-[90px_1fr] items-center gap-1 text-xs">
                          <label className="font-semibold text-gray-700 dark:text-gray-300">Duty</label>
                          <select
                            value={dutyInst.duty ?? 2}
                            onChange={(e) => onUpdateDutyInstrument(selectedInstIndex, { duty: Number(e.target.value) })}
                            className={`border px-1 py-0.5 text-xs rounded-[2px] font-bold ${
                              isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                            }`}
                          >
                            <option value={0}>12.5%</option>
                            <option value={1}>25%</option>
                            <option value={2}>50% (square)</option>
                            <option value={3}>75%</option>
                          </select>
                        </div>
                      </>
                    )}

                    {selectedInstType === 1 && (
                      <>
                        <div className="grid grid-cols-[90px_1fr] items-center gap-1 text-xs">
                          <label className="font-semibold text-gray-700 dark:text-gray-300">Output level</label>
                          <select
                            value={waveInst.outputLevel ?? 1}
                            onChange={(e) => onUpdateWaveInstrument(selectedInstIndex, { outputLevel: Number(e.target.value) })}
                            className={`border px-1 py-0.5 text-xs rounded-[2px] font-bold ${
                              isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                            }`}
                          >
                            <option value={0}>0: Mute (No sound)</option>
                            <option value={1}>1: 100% Volume</option>
                            <option value={2}>2: 50% Volume</option>
                            <option value={3}>3: 25% Volume</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-[90px_1fr] items-center gap-1 text-xs">
                          <label className="font-semibold text-gray-700 dark:text-gray-300">Waveform</label>
                          <select
                            value={waveInst.waveform ?? 0}
                            onChange={(e) => {
                              const wIdx = Number(e.target.value);
                              onUpdateWaveInstrument(selectedInstIndex, { waveform: wIdx });
                              setSelectedWaveIndex(wIdx);
                            }}
                            className={`border px-1 py-0.5 text-xs rounded-[2px] font-mono font-bold ${
                              isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                            }`}
                          >
                            {Array.from({ length: 16 }, (_, i) => (
                              <option key={i} value={i}>
                                Wave #{i}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Waveform Preview (WavePaintbox equivalent) */}
                        <div className="mt-1 flex flex-col gap-1">
                          <div className="text-[10px] text-gray-500 font-semibold flex justify-between items-center">
                            <span>Wave #{waveInst.waveform ?? 0} Waveform</span>
                            <span className="font-mono text-[9px] text-gray-400">32 samples · 4-bit</span>
                          </div>
                          <div
                            title="Waveform associated with this instrument. Click to jump to Waves tab to edit."
                            onClick={() => {
                              setSelectedWaveIndex(waveInst.waveform ?? 0);
                              setActiveMainTab('Waves');
                            }}
                            className="h-16 bg-[#081808] border border-[#163820] hover:border-emerald-600 rounded-[2px] p-1 relative overflow-hidden flex items-center justify-center cursor-pointer group"
                          >
                            <svg className="w-full h-full" viewBox="0 0 128 36" preserveAspectRatio="none">
                              {/* Background guideline */}
                              <line x1="0" y1="18" x2="128" y2="18" stroke="#122a12" strokeDasharray="3,3" strokeWidth="0.8" />
                              {(() => {
                                const wIdx = waveInst.waveform ?? 0;
                                const wSamples = song.waves[wIdx] || Array(32).fill(0);
                                const points = wSamples.map((v, i) => {
                                  const x = (i / 31) * 128;
                                  const y = 34 - (v / 15) * 32;
                                  return `${x},${y}`;
                                }).join(' ');

                                return (
                                  <>
                                    <polyline
                                      fill="none"
                                      stroke="#8bac0f"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      points={points}
                                    />
                                    {wSamples.map((v, i) => (
                                      <circle
                                        key={i}
                                        cx={(i / 31) * 128}
                                        cy={34 - (v / 15) * 32}
                                        r="1.2"
                                        fill="#9bbc0f"
                                      />
                                    ))}
                                  </>
                                );
                              })()}
                            </svg>
                            <span className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition text-[8px] font-mono text-emerald-300 bg-black/70 px-1 rounded">
                              Click to edit wave ↗
                            </span>
                          </div>
                        </div>
                      </>
                    )}

                    {selectedInstType === 2 && (
                      <>
                        <div className="grid grid-cols-[90px_1fr] items-center gap-1 text-xs">
                          <label className="font-semibold text-gray-700 dark:text-gray-300">Counter step</label>
                          <select
                            value={noiseInst.counterStep ?? 0}
                            onChange={(e) => onUpdateNoiseInstrument(selectedInstIndex, { counterStep: Number(e.target.value) as 0 | 1 })}
                            className={`border px-1 py-0.5 text-xs rounded-[2px] font-bold ${
                              isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                            }`}
                          >
                            <option value={0}>15-bit (Periodic/White)</option>
                            <option value={1}>7-bit (Metallic/Buzz)</option>
                          </select>
                        </div>
                      </>
                    )}
                  </fieldset>
                </div>
              </div>

              {/* RIGHT COLUMN: SUBPATTERN GRID (32 rows matching Screenshot 2) */}
              <div
                tabIndex={0}
                onKeyDown={handleSubpatternKeyDown}
                className={`w-60 border flex flex-col shrink-0 select-none font-mono focus:outline-none rounded-[3px] overflow-hidden ${
                  isLight ? 'border-[#7f9db9] bg-[#ece9e1]' : 'border-zinc-700 bg-[#161622]'
                }`}
              >
                <div
                  className={`px-2 py-1 text-xs font-bold border-b flex items-center justify-between ${
                    isLight ? 'bg-[#ece9d8] border-[#abb7bc] text-black' : 'bg-[#22222a] border-zinc-800 text-zinc-200'
                  }`}
                >
                  <span>Subpattern</span>
                  <span className="text-[10px] opacity-70 font-sans">
                    {currentInst?.subpatternEnabled ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>

                {/* 32 Subpattern Rows (0..31) */}
                <div className="flex-1 overflow-y-auto">
                  {Array.from({ length: 32 }, (_, r) => {
                    const isSubBar = r % 16 === 0;
                    const isSubBeat = r % 4 === 0 && !isSubBar;
                    const isCurSubRow = subRow === r;

                    const cell = currentInst?.subpattern?.[r] || {
                      note: NO_NOTE,
                      instrument: 0,
                      volume: 0,
                      effectCode: 0,
                      effectParams: 0,
                    };

                    // Format Note Transpose (+00, +07, -12, or ...)
                    let transposeStr = '...';
                    if (cell.note !== NO_NOTE && cell.note !== undefined && cell.note <= 72) {
                      const offset = cell.note - 36;
                      transposeStr = offset >= 0 ? `+${offset.toString().padStart(2, '0')}` : `${offset.toString().padStart(3, '0')}`;
                    }

                    const instStr = cell.instrument > 0 ? cell.instrument.toString(16).toUpperCase().padStart(2, '0') : '..';
                    const jumpStr = cell.volume > 0 ? `J${(cell.volume - 1).toString().padStart(2, '0')}` : '...';
                    const effCodeStr = cell.effectCode > 0 ? cell.effectCode.toString(16).toUpperCase() : '.';
                    const effParamStr =
                      cell.effectCode > 0 || cell.effectParams > 0
                        ? cell.effectParams.toString(16).toUpperCase().padStart(2, '0')
                        : '..';

                    const rowBg = isCurSubRow
                      ? isLight
                        ? 'bg-[#316ac5] text-white font-bold'
                        : 'bg-blue-600 text-white font-bold'
                      : isSubBar
                      ? isLight
                        ? 'bg-[#d6cbba]'
                        : 'bg-[#242434]'
                      : isSubBeat
                      ? isLight
                        ? 'bg-[#ded7c9]'
                        : 'bg-[#1c1c28]'
                      : isLight
                      ? 'bg-[#ece9e1]'
                      : 'bg-[#161622]';

                    return (
                      <div
                        key={r}
                        onClick={() => setSubRow(r)}
                        className={`grid grid-cols-[1fr_24px_28px_36px_24px] items-center text-[11px] px-1 py-0.5 border-b border-black/5 dark:border-white/5 cursor-pointer ${rowBg}`}
                      >
                        {/* Note Transpose */}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubRow(r);
                            setSubCol(0);
                          }}
                          className={`truncate ${
                            isCurSubRow && subCol === 0
                              ? 'underline font-black'
                              : cell.note !== NO_NOTE
                              ? isLight
                                ? 'text-[#002266] font-bold'
                                : 'text-amber-300 font-bold'
                              : isLight
                              ? 'text-gray-400'
                              : 'text-zinc-600'
                          }`}
                        >
                          {transposeStr}
                        </span>

                        {/* Inst */}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubRow(r);
                            setSubCol(1);
                          }}
                          className={`text-center ${
                            isCurSubRow && subCol === 1
                              ? 'underline font-black'
                              : cell.instrument > 0
                              ? isLight
                                ? 'text-[#660000] font-bold'
                                : 'text-emerald-400 font-bold'
                              : isLight
                              ? 'text-gray-400'
                              : 'text-zinc-600'
                          }`}
                        >
                          {instStr}
                        </span>

                        {/* Jump */}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubRow(r);
                            setSubCol(2);
                          }}
                          className={`text-center ${
                            isCurSubRow && subCol === 2
                              ? 'underline font-black'
                              : cell.volume > 0
                              ? isLight
                                ? 'text-[#005500] font-bold'
                                : 'text-cyan-400 font-bold'
                              : isLight
                              ? 'text-gray-400'
                              : 'text-zinc-600'
                          }`}
                        >
                          {jumpStr}
                        </span>

                        {/* Effect */}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubRow(r);
                            setSubCol(3);
                          }}
                          className={`text-right ${
                            isCurSubRow && (subCol === 3 || subCol === 4)
                              ? 'underline font-black'
                              : getEffectColor(cell.effectCode, isLight)
                          }`}
                        >
                          {effCodeStr}
                          {effParamStr}
                        </span>

                        {/* Row Index on the right */}
                        <span
                          className={`text-right text-[10px] font-sans font-bold pl-1 ${
                            isCurSubRow ? 'text-white' : isLight ? 'text-gray-500' : 'text-zinc-500'
                          }`}
                        >
                          {r}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: Waves (Wave Editor + Canvas - matching Screenshot 3) */}
          {/* ========================================================= */}
          {activeMainTab === 'Waves' && (
            <div className={`flex-1 p-3 overflow-y-auto flex flex-col gap-3 ${isLight ? 'bg-white' : 'bg-[#181820]'}`}>
              {/* Wave Editor GroupBox */}
              <fieldset
                className={`border p-3 rounded-[3px] max-w-2xl ${
                  isLight ? 'border-[#7f9db9] bg-[#fafafa]' : 'border-zinc-700 bg-[#20202a]'
                }`}
              >
                <legend className="px-1.5 text-xs font-bold text-gray-800 dark:text-gray-200">
                  Wave Editor
                </legend>

                <div className="flex flex-col gap-2.5 text-xs">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="font-semibold text-gray-700 dark:text-gray-300">Wave</label>
                      <input
                        type="number"
                        min={0}
                        max={15}
                        value={selectedWaveIndex}
                        onChange={(e) => setSelectedWaveIndex(Math.max(0, Math.min(15, Number(e.target.value))))}
                        className={`w-16 border px-1.5 py-0.5 text-center font-mono font-bold rounded-[2px] ${
                          isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                        }`}
                      />
                    </div>

                    <div className="flex-1 flex items-center gap-2">
                      <label className="font-semibold text-gray-700 dark:text-gray-300">Hex representation</label>
                      <input
                        type="text"
                        value={waveHex}
                        onChange={(e) => handleHexWaveInput(e.target.value)}
                        className={`flex-1 border px-2 py-0.5 font-mono text-xs uppercase rounded-[2px] ${
                          isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                        }`}
                        maxLength={32}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={playWhileDrawing}
                        onChange={(e) => setPlayWhileDrawing(e.target.checked)}
                      />
                      <span>Play wave while drawing</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onPreviewNote(2, 24, selectedWaveIndex + 1)}
                        className="px-2.5 py-0.5 bevel-button text-xs font-bold text-black hover:bg-white"
                      >
                        Audition (C-3)
                      </button>
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* Large Interactive Waveform Canvas matching Screenshot 3 */}
              <div className="flex-1 min-h-[300px] border border-black/20 rounded-[3px] overflow-hidden relative shadow-inner">
                <canvas
                  ref={waveCanvasRef}
                  width={1000}
                  height={400}
                  onMouseDown={(e) => {
                    setIsDrawingWave(true);
                    handleWaveCanvasInteract(e);
                  }}
                  onMouseMove={(e) => {
                    if (isDrawingWave) handleWaveCanvasInteract(e);
                  }}
                  onMouseUp={() => setIsDrawingWave(false)}
                  onMouseLeave={() => setIsDrawingWave(false)}
                  className="w-full h-full block cursor-crosshair"
                />
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: Comments */}
          {/* ========================================================= */}
          {activeMainTab === 'Comments' && (
            <div className={`flex-1 p-4 overflow-y-auto flex flex-col gap-2 ${isLight ? 'bg-white' : 'bg-[#181820]'}`}>
              <fieldset
                className={`border p-3 rounded-[3px] flex-1 flex flex-col ${
                  isLight ? 'border-[#7f9db9] bg-[#fafafa]' : 'border-zinc-700 bg-[#20202a]'
                }`}
              >
                <legend className="px-1.5 text-xs font-bold text-gray-800 dark:text-gray-200">
                  Song Comments
                </legend>
                <textarea
                  value={song.comment || ''}
                  onChange={(e) => onUpdateSong({ comment: e.target.value })}
                  placeholder="Song notes, credits, release info..."
                  className={`w-full flex-1 p-2 font-mono text-xs border rounded-[2px] resize-none ${
                    isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                  }`}
                />
              </fieldset>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: Routines / FX Reference Guide */}
          {/* ========================================================= */}
          {activeMainTab === 'Routines' && (
            <div className={`flex-1 p-4 overflow-y-auto text-xs ${isLight ? 'bg-white' : 'bg-[#181820]'}`}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Interactive Effect Reference */}
                <fieldset
                  className={`border p-3 rounded-[3px] flex flex-col gap-2 ${
                    isLight ? 'border-[#7f9db9] bg-[#fafafa]' : 'border-zinc-700 bg-[#20202a]'
                  }`}
                >
                  <legend className="px-1.5 font-bold flex items-center gap-2">
                    <span>hUGETracker Effect Reference</span>
                    <button
                      onClick={() => onOpenEffectHelper(cursorChannel, cursorRow)}
                      className="px-2 py-0.5 text-[10px] bevel-button font-bold text-blue-700 hover:bg-white"
                    >
                      Open FX Assistant (Ctrl+H)
                    </button>
                  </legend>

                  {/* Search box */}
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="text"
                      placeholder="Filter effects (e.g., vibrato, volume, slide, 8xx)..."
                      value={effectSearchFilter}
                      onChange={(e) => setEffectSearchFilter(e.target.value)}
                      className={`flex-1 border px-2 py-1 text-xs rounded-[2px] ${
                        isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                      }`}
                    />
                    {effectSearchFilter && (
                      <button
                        onClick={() => setEffectSearchFilter('')}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-black"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Filtered Effects List */}
                  <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
                    {Object.entries(EFFECT_INFO)
                      .map(([codeStr, fx]) => ({
                        code: Number(codeStr),
                        syntax: fx.hex,
                        name: fx.name,
                        description: fx.desc,
                        category: fx.category,
                      }))
                      .filter(
                        (fx) =>
                          fx.name.toLowerCase().includes(effectSearchFilter.toLowerCase()) ||
                          fx.syntax.toLowerCase().includes(effectSearchFilter.toLowerCase()) ||
                          fx.description.toLowerCase().includes(effectSearchFilter.toLowerCase()) ||
                          fx.category.toLowerCase().includes(effectSearchFilter.toLowerCase())
                      )
                      .map((fx) => (
                        <div
                          key={fx.code}
                          className={`p-2 border rounded-[2px] flex items-start justify-between gap-2 ${
                            isLight ? 'bg-white border-gray-200 hover:border-[#316ac5]' : 'bg-[#15151c] border-zinc-700/80 hover:border-blue-500'
                          }`}
                        >
                          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                                {fx.syntax}
                              </span>
                              <span className="font-bold text-xs">{fx.name}</span>
                              <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                                {fx.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-tight">
                              {fx.description}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              onUpdateCell(cursorChannel, cursorRow, {
                                effectCode: fx.code,
                                effectParams: 0,
                              });
                            }}
                            className="px-2 py-1 text-[10px] font-bold bevel-button shrink-0 hover:bg-white text-emerald-700"
                            title={`Insert ${fx.syntax} into Channel ${cursorChannel + 1}, Row ${cursorRow}`}
                          >
                            Insert
                          </button>
                        </div>
                      ))}
                  </div>
                </fieldset>

                {/* Custom ASM Routines */}
                <fieldset
                  className={`border p-3 rounded-[3px] flex flex-col gap-2 ${
                    isLight ? 'border-[#7f9db9] bg-[#fafafa]' : 'border-zinc-700 bg-[#20202a]'
                  }`}
                >
                  <legend className="px-1.5 font-bold">Custom Assembly Routines (6xx)</legend>
                  <p className="text-[11px] text-gray-600 dark:text-zinc-400 mb-1">
                    Define exported C/ASM symbol callbacks executed by the hUGEDriver routine effect <code>600</code> - <code>607</code>.
                  </p>
                  <div className="flex flex-col gap-1.5 text-[11px]">
                    {Array.from({ length: 8 }, (_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-20 font-mono font-bold">Routine {i} (60{i}):</span>
                        <input
                          type="text"
                          value={song.routines?.[i] || ''}
                          onChange={(e) => {
                            const newRoutines = [...(song.routines || [])];
                            newRoutines[i] = e.target.value;
                            onUpdateSong({ routines: newRoutines });
                          }}
                          placeholder={`routine_${i}_symbol`}
                          className={`flex-1 border px-2 py-0.5 font-mono text-xs rounded-[2px] ${
                            isLight ? 'bg-white border-[#7f9db9] text-black' : 'bg-[#15151c] border-zinc-700 text-white'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div
        className={`px-3 py-0.5 text-xs border-t flex items-center justify-between shrink-0 font-mono ${
          isLight ? 'bg-[#ece9d8] border-[#abb7bc] text-gray-800' : 'bg-[#181820] border-zinc-800 text-zinc-400'
        }`}
      >
        <div className="flex items-center gap-4">
          <span>Row: <b className={isLight ? 'text-black' : 'text-white'}>{cursorRow.toString().padStart(2, '0')}</b> / 63</span>
          <span>Order: <b className={isLight ? 'text-black' : 'text-white'}>{(activeOrd + 1).toString().padStart(2, '0')}</b></span>
          <span>Channel: <b className={isLight ? 'text-black' : 'text-white'}>{cursorChannel + 1} ({['Duty 1', 'Duty 2', 'Wave', 'Noise'][cursorChannel]})</b></span>
          <span>Step: <b className={isLight ? 'text-black' : 'text-white'}>{currentStep}</b></span>
          <span>Octave: <b className={isLight ? 'text-black' : 'text-white'}>{currentOctave}</b></span>
          <span>Inst: <b className={isLight ? 'text-black' : 'text-white'}>{currentInstrument.toString(16).toUpperCase().padStart(2, '0')}</b></span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500">Right-click for cell options</span>
          <span className={playbackState.isPlaying ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-500'}>
            {playbackState.isPlaying ? '● PLAYING' : '■ STOPPED'}
          </span>
        </div>
      </div>

      {/* Tracker Grid Right-Click Context Menu */}
      {trackerContextMenu && trackerContextMenu.isOpen && (
        <div
          className="fixed inset-0 z-50 select-none"
          onClick={() => setTrackerContextMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setTrackerContextMenu(null);
          }}
        >
          <div
            style={{ left: `${trackerContextMenu.x}px`, top: `${trackerContextMenu.y}px` }}
            onClick={(e) => e.stopPropagation()}
            className={`absolute w-56 border shadow-2xl py-1 text-xs z-50 rounded-[2px] font-sans ${
              isLight ? 'bg-[#ece9d8] border-[#7f9db9] text-black' : 'bg-[#202028] border-zinc-700 text-white'
            }`}
          >
            {/* Context menu header */}
            <div className={`px-3 py-1 font-bold border-b text-[10px] opacity-70 ${isLight ? 'border-[#abb7bc]' : 'border-zinc-700'}`}>
              CH{trackerContextMenu.channel + 1} • Row {trackerContextMenu.row.toString().padStart(2, '0')}
            </div>

            {/* Cut / Copy / Paste */}
            <button
              onClick={handleCutCell}
              className="w-full px-3 py-1 text-left hover:bg-[#316ac5] hover:text-white flex items-center justify-between"
            >
              <span>Cut</span>
              <span className="text-[10px] opacity-60 font-mono">Ctrl+X</span>
            </button>
            <button
              onClick={handleCopyCell}
              className="w-full px-3 py-1 text-left hover:bg-[#316ac5] hover:text-white flex items-center justify-between"
            >
              <span>Copy</span>
              <span className="text-[10px] opacity-60 font-mono">Ctrl+C</span>
            </button>
            <button
              onClick={handlePasteCell}
              disabled={!clipboardCell}
              className={`w-full px-3 py-1 text-left flex items-center justify-between ${
                clipboardCell ? 'hover:bg-[#316ac5] hover:text-white' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <span>Paste</span>
              <span className="text-[10px] opacity-60 font-mono">Ctrl+V</span>
            </button>
            <button
              onClick={handleDeleteCell}
              className="w-full px-3 py-1 text-left hover:bg-[#316ac5] hover:text-white flex items-center justify-between"
            >
              <span>Clear Cell</span>
              <span className="text-[10px] opacity-60 font-mono">Del</span>
            </button>

            <div className={`border-t my-1 ${isLight ? 'border-[#abb7bc]' : 'border-zinc-700'}`} />

            {/* Insert / Delete row in pattern */}
            <button
              onClick={handleInsertRow}
              className="w-full px-3 py-1 text-left hover:bg-[#316ac5] hover:text-white flex items-center justify-between"
            >
              <span>Insert Row (Push Down)</span>
              <span className="text-[10px] opacity-60 font-mono">Ins</span>
            </button>
            <button
              onClick={handleDeleteRow}
              className="w-full px-3 py-1 text-left hover:bg-[#316ac5] hover:text-white flex items-center justify-between"
            >
              <span>Delete Row (Pull Up)</span>
              <span className="text-[10px] opacity-60 font-mono">Shift+Del</span>
            </button>

            <div className={`border-t my-1 ${isLight ? 'border-[#abb7bc]' : 'border-zinc-700'}`} />

            {/* Transpose */}
            <button
              onClick={() => handleTranspose(1)}
              className="w-full px-3 py-1 text-left hover:bg-[#316ac5] hover:text-white flex items-center justify-between"
            >
              <span>Transpose +1 Semitone</span>
              <span className="text-[10px] opacity-60 font-mono">Shift+▲</span>
            </button>
            <button
              onClick={() => handleTranspose(-1)}
              className="w-full px-3 py-1 text-left hover:bg-[#316ac5] hover:text-white flex items-center justify-between"
            >
              <span>Transpose -1 Semitone</span>
              <span className="text-[10px] opacity-60 font-mono">Shift+▼</span>
            </button>
            <button
              onClick={() => handleTranspose(12)}
              className="w-full px-3 py-1 text-left hover:bg-[#316ac5] hover:text-white flex items-center justify-between"
            >
              <span>Transpose +1 Octave</span>
              <span className="text-[10px] opacity-60 font-mono">Ctrl+▲</span>
            </button>
            <button
              onClick={() => handleTranspose(-12)}
              className="w-full px-3 py-1 text-left hover:bg-[#316ac5] hover:text-white flex items-center justify-between"
            >
              <span>Transpose -1 Octave</span>
              <span className="text-[10px] opacity-60 font-mono">Ctrl+▼</span>
            </button>

            <div className={`border-t my-1 ${isLight ? 'border-[#abb7bc]' : 'border-zinc-700'}`} />

            {/* Tools */}
            <button
              onClick={handleSetInstrument}
              className="w-full px-3 py-1 text-left hover:bg-[#316ac5] hover:text-white flex items-center justify-between"
            >
              <span>Set Inst to {currentInstrument.toString(16).toUpperCase().padStart(2, '0')}</span>
              <span className="text-[10px] opacity-60 font-mono">Ctrl+I</span>
            </button>
            <button
              onClick={() => {
                setTrackerContextMenu(null);
                onOpenEffectHelper(trackerContextMenu.channel, trackerContextMenu.row);
              }}
              className="w-full px-3 py-1 text-left hover:bg-[#316ac5] hover:text-white flex items-center justify-between font-semibold text-blue-600 dark:text-blue-400"
            >
              <span>Effect Assistant...</span>
              <span className="text-[10px] opacity-60 font-mono">Ctrl+H</span>
            </button>
          </div>
        </div>
      )}

      {/* Order Matrix Right-Click Context Menu */}
      {orderContextMenu && orderContextMenu.isOpen && (
        <div
          className="fixed inset-0 z-50 select-none"
          onClick={() => setOrderContextMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setOrderContextMenu(null);
          }}
        >
          <div
            style={{ left: `${orderContextMenu.x}px`, top: `${orderContextMenu.y}px` }}
            onClick={(e) => e.stopPropagation()}
            className={`absolute w-48 border shadow-2xl py-1 text-xs z-50 rounded-[2px] font-sans ${
              isLight ? 'bg-[#ece9d8] border-[#7f9db9] text-black' : 'bg-[#202028] border-zinc-700 text-white'
            }`}
          >
            <div className={`px-3 py-1 font-bold border-b text-[10px] opacity-70 ${isLight ? 'border-[#abb7bc]' : 'border-zinc-700'}`}>
              Order {orderContextMenu.orderIndex + 1}
            </div>
            <button
              onClick={() => {
                onInsertOrder(orderContextMenu.orderIndex + 1, false);
                setOrderContextMenu(null);
              }}
              className="w-full px-3 py-1 text-left hover:bg-[#316ac5] hover:text-white"
            >
              Insert Blank Order Below
            </button>
            <button
              onClick={() => {
                onInsertOrder(orderContextMenu.orderIndex + 1, true);
                setOrderContextMenu(null);
              }}
              className="w-full px-3 py-1 text-left hover:bg-[#316ac5] hover:text-white"
            >
              Clone / Duplicate Order
            </button>
            <button
              onClick={() => {
                onMoveOrder(orderContextMenu.orderIndex, 'up');
                setOrderContextMenu(null);
              }}
              disabled={orderContextMenu.orderIndex <= 0}
              className="w-full px-3 py-1 text-left hover:bg-[#316ac5] hover:text-white disabled:opacity-40"
            >
              Move Order Up
            </button>
            <button
              onClick={() => {
                onMoveOrder(orderContextMenu.orderIndex, 'down');
                setOrderContextMenu(null);
              }}
              className="w-full px-3 py-1 text-left hover:bg-[#316ac5] hover:text-white"
            >
              Move Order Down
            </button>
            <div className={`border-t my-1 ${isLight ? 'border-[#abb7bc]' : 'border-zinc-700'}`} />
            <button
              onClick={() => {
                onDeleteOrder(orderContextMenu.orderIndex);
                setOrderContextMenu(null);
              }}
              className="w-full px-3 py-1 text-left hover:bg-red-600 hover:text-white text-red-600"
            >
              Delete Order
            </button>
          </div>
        </div>
      )}

      {/* Floating Quick Mobile Mode Switch for Small Screens */}
      <button
        onClick={() => onSwitchGuiMode('mobile')}
        className="md:hidden fixed bottom-4 left-4 z-40 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-2xl text-xs font-bold flex items-center gap-1.5 border border-emerald-300"
        title="Switch to touch-friendly Mobile DAW"
      >
        <Smartphone className="w-4 h-4" />
        <span>Switch to Mobile View</span>
      </button>

      {/* About Modal */}
      {aboutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`w-96 border p-4 shadow-2xl rounded-[3px] flex flex-col gap-3 text-xs ${
              isLight ? 'bg-[#ece9d8] border-[#7f9db9] text-black' : 'bg-zinc-900 border-zinc-700 text-white'
            }`}
          >
            <div className="flex items-center gap-2 border-b pb-2">
              <span className="bg-amber-400 text-black px-1.5 py-0.5 font-bold font-mono text-xs">hT</span>
              <span className="font-bold text-sm">About hUGETracker</span>
            </div>
            <p>
              hUGETracker is the premier music tracker designed specifically for creating authentic music for the Nintendo Game Boy using <b>hUGEDriver</b>.
            </p>
            <p className="text-[11px] opacity-80">
              Web port featuring full synthesis engine emulation, .uge parser/serializer, GBDK C export, and dual Classic & Modern interfaces.
            </p>
            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={() => setAboutModal(false)}
                className="px-4 py-1 bevel-button font-bold text-black hover:bg-white"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Options Modal Dialog matching Screenshot 1 */}
      {optionsModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 select-none"
          onClick={() => setOptionsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-[460px] border shadow-2xl rounded-[3px] flex flex-col text-xs font-sans ${
              isLight ? 'bg-[#ece9d8] border-[#7f9db9] text-black' : 'bg-[#22222b] border-zinc-700 text-white'
            }`}
          >
            {/* Title Bar */}
            <div
              className={`px-2 py-1 flex items-center justify-between font-bold text-xs select-none ${
                isLight ? 'bg-[#0a246a] text-white' : 'bg-[#181822] text-zinc-100 border-b border-zinc-700'
              }`}
            >
              <span>Options</span>
              <button
                onClick={() => setOptionsModalOpen(false)}
                className="w-4 h-4 bg-[#c75050] hover:bg-red-600 text-white font-bold flex items-center justify-center text-[10px] rounded-[1px] leading-none"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Tab Headers */}
            <div className={`flex items-center px-2 pt-2 border-b gap-1 ${isLight ? 'border-[#abb7bc]' : 'border-zinc-700'}`}>
              {(['General', 'Keyboard', 'Appearance'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setOptionsActiveTab(t)}
                  className={`px-3 py-1 font-semibold rounded-t-[3px] border-t border-l border-r text-xs transition ${
                    optionsActiveTab === t
                      ? isLight
                        ? 'bg-[#ece9d8] border-[#abb7bc] text-black font-bold -mb-px pb-1.5'
                        : 'bg-[#22222b] border-zinc-600 text-white font-bold -mb-px pb-1.5'
                      : isLight
                      ? 'bg-[#d8d5c5] border-transparent text-gray-700 hover:bg-white/40'
                      : 'bg-[#1c1c24] border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-3">
              {optionsActiveTab === 'General' && (
                <fieldset
                  className={`border p-3 rounded-[3px] flex flex-col gap-2.5 ${
                    isLight ? 'border-[#7f9db9] bg-transparent' : 'border-zinc-700'
                  }`}
                >
                  <legend className="px-1 font-semibold text-xs text-gray-800 dark:text-gray-200">Options</legend>

                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={options.showScopes}
                      onChange={(e) => updateOption('showScopes', e.target.checked)}
                      className="rounded"
                    />
                    <span>Show scopes (uses more CPU)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={options.previewOnPlace}
                      onChange={(e) => updateOption('previewOnPlace', e.target.checked)}
                      className="rounded"
                    />
                    <span>Play preview when placing notes</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={options.previewOnBump}
                      onChange={(e) => updateOption('previewOnBump', e.target.checked)}
                      className="rounded"
                    />
                    <span>Play preview when bumping notes up/down</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={options.hexPatternRows}
                      onChange={(e) => updateOption('hexPatternRows', e.target.checked)}
                      className="rounded"
                    />
                    <span>Display pattern row numbers in hexadecimal notation</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={options.hexOrderRows}
                      onChange={(e) => updateOption('hexOrderRows', e.target.checked)}
                      className="rounded"
                    />
                    <span>Display order row numbers in hexadecimal notation</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={options.gridWaveform}
                      onChange={(e) => updateOption('gridWaveform', e.target.checked)}
                      className="rounded"
                    />
                    <span>Display grid on waveform editor</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={options.tabsVertical}
                      onChange={(e) => updateOption('tabsVertical', e.target.checked)}
                      className="rounded"
                    />
                    <span>Display tabs vertically</span>
                  </label>
                </fieldset>
              )}

              {optionsActiveTab === 'Keyboard' && (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto p-1 text-xs">
                  <div className="font-bold border-b pb-1 text-gray-800 dark:text-gray-200">Tracker Keyboard Shortcuts</div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                    <div><b>Z..M / ,</b> : Low Octave (C..C)</div>
                    <div><b>Q..I</b> : High Octave (C..C)</div>
                    <div><b>Space</b> : Play / Stop Song</div>
                    <div><b>Ctrl+Space</b> : Play from Cursor</div>
                    <div><b>Del / Bksp</b> : Delete Note / Cell</div>
                    <div><b>Ins</b> : Insert Blank Row</div>
                    <div><b>Shift+Del</b> : Delete Row</div>
                    <div><b>Shift+▲/▼</b> : Transpose ±1 Semitone</div>
                    <div><b>Ctrl+▲/▼</b> : Transpose ±1 Octave</div>
                    <div><b>Ctrl+I</b> : Set Instrument</div>
                    <div><b>Ctrl+H</b> : Effect Assistant</div>
                    <div><b>Ctrl+X / C / V</b> : Cut / Copy / Paste</div>
                  </div>
                </div>
              )}

              {optionsActiveTab === 'Appearance' && (
                <div className="flex flex-col gap-3 p-1 text-xs">
                  <div className="font-bold border-b pb-1 text-gray-800 dark:text-gray-200">Tracker Appearance</div>
                  <p className="text-[11px] text-gray-700 dark:text-gray-300">
                    hUGETracker classic desktop skin with authentic Windows / Lazarus LCL widget styling.
                  </p>
                  <div className="text-[10px] text-gray-500">
                    Version 1.0.6 Web Port • All sound emulation powered by WebAudio 2.0 APU.
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Buttons */}
            <div className={`p-2 border-t flex justify-end gap-2 ${isLight ? 'bg-[#ece9d8] border-[#abb7bc]' : 'bg-[#1e1e26] border-zinc-700'}`}>
              <button
                onClick={() => setOptionsModalOpen(false)}
                className="px-6 py-1 bevel-button font-bold text-black hover:bg-white text-xs"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
