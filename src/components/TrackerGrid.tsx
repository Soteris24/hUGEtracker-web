import React, { useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Radio, Sparkles } from 'lucide-react';
import {
  TSong,
  NOTE_NAMES,
  NO_NOTE,
  TCell,
} from '../types/uge';

interface TrackerGridProps {
  song: TSong;
  currentOrder: number;
  playingRow: number;
  isPlaying: boolean;
  currentOctave: number;
  currentInstrument: number;
  currentStep: number;
  cursorRow: number;
  cursorChannel: number;
  cursorColumn: number; // 0=note, 1=inst, 2=vol, 3=effCode, 4=effParam
  onCursorChange: (row: number, channel: number, column: number) => void;
  onUpdateCell: (channel: number, row: number, updates: Partial<TCell>) => void;
  onPreviewNote: (channel: number, note: number, inst: number) => void;
  onOpenEffectHelper: (channel: number, row: number) => void;
  mutedChannels: boolean[];
  soloChannels: boolean[];
  onToggleMute: (ch: number) => void;
  onToggleSolo: (ch: number) => void;
  meters: [number, number, number, number];
  onPlay?: (fromCursor?: boolean) => void;
  onStop?: () => void;
  colorTheme?: 'dark' | 'light';
}

// ModPlug Tracker keyboard mappings to semitone offsets
const KEY_TO_SEMITONE: Record<string, number> = {
  // Lower octave (relative to currentOctave)
  z: 0,  // C
  s: 1,  // C#
  x: 2,  // D
  d: 3,  // D#
  c: 4,  // E
  v: 5,  // F
  g: 6,  // F#
  b: 7,  // G
  h: 8,  // G#
  n: 9,  // A
  j: 10, // A#
  m: 11, // B
  ',': 12, // C+1

  // Upper octave (relative to currentOctave + 1)
  q: 12, // C
  '2': 13, // C#
  w: 14, // D
  '3': 15, // D#
  e: 16, // E
  r: 17, // F
  '5': 18, // F#
  t: 19, // G
  '6': 20, // G#
  y: 21, // A
  '7': 22, // A#
  u: 23, // B
  i: 24, // C+1
};

/**
 * Returns authentic hUGETracker effect color based on effect code category:
 * - Pitch: 1 (Porta Up), 2 (Porta Down), 3 (Tone Porta), 4 (Vibrato)
 * - Volume: A (Vol Slide), C (Set Vol)
 * - Pan: 8 (Set Pan)
 * - Song Control: 5 (Master Vol), B (Jump), D (Break), F (Tempo)
 * - Misc: 0 (Arp), 6 (Routine), 7 (Delay), 9 (Duty/Wave), E (Cut)
 */
function getEffectColorClass(effectCode: number, theme: 'dark' | 'light'): string {
  if (effectCode === 0) return theme === 'dark' ? 'text-zinc-600' : 'text-slate-400';

  if (theme === 'dark') {
    switch (effectCode) {
      case 1:
      case 2:
      case 3:
      case 4:
        return 'text-cyan-400 font-semibold'; // Pitch
      case 0x0a:
      case 0x0c:
        return 'text-emerald-400 font-semibold'; // Volume
      case 8:
        return 'text-amber-400 font-semibold'; // Pan
      case 5:
      case 0x0b:
      case 0x0d:
      case 0x0f:
        return 'text-blue-400 font-semibold'; // Song / control
      default:
        return 'text-purple-400 font-semibold'; // Misc / routine / delay
    }
  } else {
    // Authentic hUGETracker light theme colors
    switch (effectCode) {
      case 1:
      case 2:
      case 3:
      case 4:
        return 'text-[#006262] font-semibold'; // Pitch (teal)
      case 0x0a:
      case 0x0c:
        return 'text-[#007f26] font-semibold'; // Volume (green)
      case 8:
        return 'text-[#7f7f00] font-semibold'; // Pan (olive)
      case 5:
      case 0x0b:
      case 0x0d:
      case 0x0f:
        return 'text-[#00007f] font-semibold'; // Song (navy)
      default:
        return 'text-[#3f3f7c] font-semibold'; // Misc (purple)
    }
  }
}

export const TrackerGrid: React.FC<TrackerGridProps> = ({
  song,
  currentOrder,
  playingRow,
  isPlaying,
  currentOctave,
  currentInstrument,
  currentStep,
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
  meters,
  onPlay,
  onStop,
  colorTheme = 'dark',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRow = isPlaying ? playingRow : cursorRow;

  // Channel titles
  const channelTitles = ['CH1: Duty 1', 'CH2: Duty 2', 'CH3: Wave', 'CH4: Noise'];

  // Auto-scroll tracker grid to active row
  useEffect(() => {
    if (containerRef.current) {
      const rowElem = containerRef.current.querySelector(`[data-row="${activeRow}"]`) as HTMLElement;
      if (rowElem) {
        const container = containerRef.current;
        const rowTop = rowElem.offsetTop;
        const targetScroll = rowTop - container.clientHeight / 2 + rowElem.clientHeight / 2;
        container.scrollTop = Math.max(0, targetScroll);
      }
    }
  }, [activeRow]);

  // Keyboard navigation & entry
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Space: Toggle playback
      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          onStop?.();
        } else {
          onPlay?.(false);
        }
        return;
      }

      // Enter: Play song / Shift+Enter: Play from cursor
      if (e.key === 'Enter') {
        e.preventDefault();
        onPlay?.(e.shiftKey);
        return;
      }

      // PageUp / PageDown: Move by 16 rows
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

      // Home / End: Move to start / end of pattern
      if (e.key === 'Home') {
        e.preventDefault();
        onCursorChange(0, cursorChannel, cursorColumn);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        onCursorChange(63, cursorChannel, cursorColumn);
        return;
      }

      // Tab / Shift+Tab: Switch channels
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          onCursorChange(cursorRow, (cursorChannel + 3) % 4, cursorColumn);
        } else {
          onCursorChange(cursorRow, (cursorChannel + 1) % 4, cursorColumn);
        }
        return;
      }

      // Arrow navigation
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

      // Delete: Clear current cell item
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (cursorColumn === 0) {
          onUpdateCell(cursorChannel, cursorRow, { note: NO_NOTE });
        } else if (cursorColumn === 1) {
          onUpdateCell(cursorChannel, cursorRow, { instrument: 0 });
        } else if (cursorColumn === 2) {
          onUpdateCell(cursorChannel, cursorRow, { volume: 0 });
        } else if (cursorColumn === 3) {
          onUpdateCell(cursorChannel, cursorRow, { effectCode: 0 });
        } else if (cursorColumn === 4) {
          onUpdateCell(cursorChannel, cursorRow, { effectParams: 0 });
        }
        return;
      }

      // Note Cut: Backquote or '=' key (sets note cut effect Exx or empty note)
      if (e.key === '`' || e.key === '=') {
        e.preventDefault();
        onUpdateCell(cursorChannel, cursorRow, { effectCode: 0x0e, effectParams: 0 });
        if (currentStep > 0) {
          onCursorChange(Math.min(63, cursorRow + currentStep), cursorChannel, cursorColumn);
        }
        return;
      }

      // Note entry via ModPlug piano keys
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
          onPreviewNote(cursorChannel, targetNote, currentInstrument);

          // Advance cursor by step
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

      // Volume / Table Jump Column (0..F)
      if (cursorColumn === 2 && /^[0-9a-fA-F]$/.test(e.key)) {
        e.preventDefault();
        const volVal = parseInt(e.key, 16);
        onUpdateCell(cursorChannel, cursorRow, { volume: volVal });
        if (currentStep > 0) {
          onCursorChange(Math.min(63, cursorRow + currentStep), cursorChannel, cursorColumn);
        }
        return;
      }

      // Effect Code Column Entry (0..F)
      if (cursorColumn === 3 && /^[0-9a-fA-F]$/.test(e.key)) {
        e.preventDefault();
        const effCode = parseInt(e.key, 16);
        onUpdateCell(cursorChannel, cursorRow, { effectCode: effCode });
        onCursorChange(cursorRow, cursorChannel, 4);
        return;
      }

      // Effect Params Column Entry (Hex digit high/low nibble)
      if (cursorColumn === 4 && /^[0-9a-fA-F]$/.test(e.key)) {
        e.preventDefault();
        const patIdx = song.orderMatrix[cursorChannel]?.[currentOrder] ?? 0;
        const pattern = song.patterns[patIdx] || [];
        const curCell = pattern[cursorRow] || {
          note: NO_NOTE,
          instrument: 0,
          volume: 0,
          effectCode: 0,
          effectParams: 0,
        };
        const currentParam = curCell.effectParams || 0;
        const digit = parseInt(e.key, 16);
        const newParam = ((currentParam & 0x0f) << 4) | digit;
        onUpdateCell(cursorChannel, cursorRow, { effectParams: newParam });
        if (currentStep > 0) {
          onCursorChange(Math.min(63, cursorRow + currentStep), cursorChannel, cursorColumn);
        }
        return;
      }
    },
    [
      cursorRow,
      cursorChannel,
      cursorColumn,
      currentOctave,
      currentInstrument,
      currentStep,
      currentOrder,
      isPlaying,
      song.orderMatrix,
      song.patterns,
      onCursorChange,
      onUpdateCell,
      onPreviewNote,
      onPlay,
      onStop,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const isLight = colorTheme === 'light';

  return (
    <div
      id="tracker-grid-workspace"
      className={`flex-1 flex flex-col overflow-hidden select-none border-t ${
        isLight ? 'bg-[#d0dbe1] text-black border-[#abb7bc]' : 'bg-[#121214] text-zinc-200 border-zinc-800'
      }`}
    >
      {/* Track Viewer Channel Header Bar */}
      <div
        className={`flex items-center text-xs font-mono font-bold shrink-0 border-b ${
          isLight ? 'bg-[#ece9d8] border-[#abb7bc] text-gray-800' : 'bg-zinc-900 border-zinc-800 text-zinc-200'
        }`}
      >
        {/* Row Index Column Header */}
        <div
          className={`w-14 py-2 text-center border-r font-bold text-[11px] ${
            isLight ? 'bg-[#d8d4c4] border-[#abb7bc] text-gray-700' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
          }`}
        >
          Row
        </div>

        {/* 4 Channels Headers */}
        {[0, 1, 2, 3].map((ch) => {
          const patIdx = song.orderMatrix[ch]?.[currentOrder] ?? 0;
          const isMuted = mutedChannels[ch];
          const isSolo = soloChannels[ch];
          const meterLevel = meters[ch] || 0;

          return (
            <div
              key={ch}
              className={`flex-1 px-3 py-1.5 border-r flex items-center justify-between min-w-0 ${
                isLight ? 'border-[#abb7bc]' : 'border-zinc-800'
              }`}
            >
              {/* Channel Label & Pattern Index Badge */}
              <div className="flex items-center gap-2 truncate">
                <span
                  className={`text-xs font-bold truncate ${
                    isLight
                      ? ch === 0
                        ? 'text-red-700'
                        : ch === 1
                        ? 'text-orange-700'
                        : ch === 2
                        ? 'text-amber-700'
                        : 'text-emerald-800'
                      : ch === 0
                      ? 'text-red-400'
                      : ch === 1
                      ? 'text-orange-400'
                      : ch === 2
                      ? 'text-yellow-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {channelTitles[ch]}
                </span>

                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    isLight
                      ? 'bg-white border border-gray-300 text-gray-800'
                      : 'bg-zinc-800 border border-zinc-700 text-zinc-300'
                  }`}
                  title={`Pattern index assigned to Order ${currentOrder}`}
                >
                  P{patIdx.toString().padStart(2, '0')}
                </span>
              </div>

              {/* Channel VU Meter & Mute/Solo Controls */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Channel Peak Meter Bar */}
                <div
                  className={`w-8 h-2 rounded-xs overflow-hidden flex ${
                    isLight ? 'bg-gray-300' : 'bg-zinc-950'
                  }`}
                >
                  <div
                    className={`h-full transition-all duration-75 ${
                      meterLevel > 0.8 ? 'bg-red-500' : meterLevel > 0.4 ? 'bg-yellow-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.round(meterLevel * 100)}%` }}
                  />
                </div>

                {/* Mute Button */}
                <button
                  onClick={() => onToggleMute(ch)}
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-xs transition ${
                    isMuted
                      ? 'bg-red-600 text-white'
                      : isLight
                      ? 'bg-[#ece9d8] hover:bg-white text-gray-700 border border-gray-400'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }`}
                  title="Mute Channel"
                >
                  M
                </button>

                {/* Solo Button */}
                <button
                  onClick={() => onToggleSolo(ch)}
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-xs transition ${
                    isSolo
                      ? 'bg-yellow-500 text-black'
                      : isLight
                      ? 'bg-[#ece9d8] hover:bg-white text-gray-700 border border-gray-400'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }`}
                  title="Solo Channel"
                >
                  S
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 64-Row Tracker Grid Matrix */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto font-mono text-xs focus:outline-none"
        tabIndex={0}
      >
        {Array.from({ length: 64 }, (_, rowIdx) => {
          const isCurrentPlayingRow = rowIdx === playingRow && isPlaying;
          const isCursorRow = rowIdx === cursorRow && !isPlaying;
          const isBeatLine = rowIdx % 4 === 0;
          const isMajorBarLine = rowIdx % 16 === 0;

          // Row background styling matching hUGETracker color rules
          let rowBgClass = '';
          if (isCurrentPlayingRow) {
            rowBgClass = isLight ? 'bg-[#7a99a9] text-white font-bold' : 'bg-[#155e37] text-white font-bold';
          } else if (isCursorRow) {
            rowBgClass = isLight ? 'bg-[#9eb4c0] text-black font-semibold' : 'bg-[#1e3a5f] text-white font-semibold';
          } else if (isMajorBarLine) {
            rowBgClass = isLight ? 'bg-[#b5c5ce]' : 'bg-[#252533]';
          } else if (isBeatLine) {
            rowBgClass = isLight ? 'bg-[#c3d1d8]' : 'bg-[#1b1b22]';
          } else {
            rowBgClass = isLight ? 'bg-[#d0dbe1] hover:bg-[#c9d5dc]' : 'bg-[#121214] hover:bg-[#1a1a20]';
          }

          return (
            <div
              key={rowIdx}
              data-row={rowIdx}
              className={`flex items-center border-b ${
                isLight ? 'border-[#abb7bc]/60' : 'border-zinc-900'
              } ${rowBgClass}`}
            >
              {/* Row Index Column (Hex 00..3F) */}
              <div
                className={`w-14 py-1 text-center font-bold text-[11px] border-r ${
                  isLight ? 'border-[#abb7bc]' : 'border-zinc-800'
                } ${
                  isCurrentPlayingRow
                    ? 'text-white'
                    : isMajorBarLine
                    ? isLight
                      ? 'text-indigo-900'
                      : 'text-amber-400'
                    : isBeatLine
                    ? isLight
                      ? 'text-slate-800'
                      : 'text-zinc-400'
                    : isLight
                    ? 'text-slate-600'
                    : 'text-zinc-600'
                }`}
              >
                {rowIdx.toString(16).toUpperCase().padStart(2, '0')}
              </div>

              {/* 4 Channel Tracker Cells */}
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

                const isCellSelected = rowIdx === cursorRow && cursorChannel === ch;

                const hasNote = cell.note !== NO_NOTE && cell.note < 72;
                const noteStr = hasNote ? NOTE_NAMES[cell.note] : '...';
                const instStr = cell.instrument > 0 ? cell.instrument.toString(16).toUpperCase().padStart(2, '0') : '..';
                const volStr = cell.volume > 0 ? `v${cell.volume.toString(16).toUpperCase()}` : '..';
                const effCodeStr = cell.effectCode > 0 ? cell.effectCode.toString(16).toUpperCase() : '.';
                const effParamsStr =
                  cell.effectCode > 0 || cell.effectParams > 0
                    ? cell.effectParams.toString(16).toUpperCase().padStart(2, '0')
                    : '..';

                const effColorClass = getEffectColorClass(cell.effectCode, isLight ? 'light' : 'dark');

                return (
                  <div
                    key={ch}
                    className={`flex-1 py-1 px-2 border-r flex items-center justify-between cursor-pointer transition-colors ${
                      isLight ? 'border-[#abb7bc]/60' : 'border-zinc-900'
                    } ${isCellSelected ? (isLight ? 'ring-2 ring-blue-600' : 'ring-2 ring-emerald-400') : ''}`}
                  >
                    {/* Subcolumn 0: Note */}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onCursorChange(rowIdx, ch, 0);
                      }}
                      className={`px-1 rounded-xs font-bold transition ${
                        isCellSelected && cursorColumn === 0
                          ? isLight
                            ? 'bg-blue-600 text-white'
                            : 'bg-emerald-600 text-white'
                          : hasNote
                          ? isLight
                            ? ch === 0
                              ? 'text-red-700'
                              : ch === 1
                              ? 'text-orange-800'
                              : ch === 2
                              ? 'text-amber-800'
                              : 'text-emerald-800'
                            : ch === 0
                            ? 'text-red-400'
                            : ch === 1
                            ? 'text-orange-400'
                            : ch === 2
                            ? 'text-yellow-400'
                            : 'text-emerald-400'
                          : isLight
                          ? 'text-slate-500'
                          : 'text-zinc-600'
                      }`}
                    >
                      {noteStr}
                    </span>

                    {/* Subcolumn 1: Instrument */}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onCursorChange(rowIdx, ch, 1);
                      }}
                      className={`px-1 rounded-xs transition ${
                        isCellSelected && cursorColumn === 1
                          ? isLight
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-emerald-600 text-white font-bold'
                          : cell.instrument > 0
                          ? isLight
                            ? 'text-[#7f7f00] font-bold'
                            : 'text-sky-300 font-bold'
                          : isLight
                          ? 'text-slate-500'
                          : 'text-zinc-600'
                      }`}
                    >
                      {instStr}
                    </span>

                    {/* Subcolumn 2: Volume / Subp Jump */}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onCursorChange(rowIdx, ch, 2);
                      }}
                      className={`px-0.5 rounded-xs text-[11px] transition ${
                        isCellSelected && cursorColumn === 2
                          ? isLight
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-emerald-600 text-white font-bold'
                          : cell.volume > 0
                          ? isLight
                            ? 'text-[#72004e] font-semibold'
                            : 'text-pink-300 font-semibold'
                          : isLight
                          ? 'text-slate-400'
                          : 'text-zinc-700'
                      }`}
                    >
                      {volStr}
                    </span>

                    {/* Subcolumn 3 & 4: Effect Code & Effect Params */}
                    <div
                      onDoubleClick={() => onOpenEffectHelper(ch, rowIdx)}
                      className="flex items-center"
                    >
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onCursorChange(rowIdx, ch, 3);
                        }}
                        className={`px-0.5 rounded-xs transition ${
                          isCellSelected && cursorColumn === 3
                            ? isLight
                              ? 'bg-blue-600 text-white font-bold'
                              : 'bg-emerald-600 text-white font-bold'
                            : effColorClass
                        }`}
                      >
                        {effCodeStr}
                      </span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onCursorChange(rowIdx, ch, 4);
                        }}
                        className={`px-0.5 rounded-xs transition ${
                          isCellSelected && cursorColumn === 4
                            ? isLight
                              ? 'bg-blue-600 text-white font-bold'
                              : 'bg-emerald-600 text-white font-bold'
                            : effColorClass
                        }`}
                      >
                        {effParamsStr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
