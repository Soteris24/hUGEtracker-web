import React, { useState, useRef } from 'react';
import { Play, RotateCcw, Sparkles, Sliders, Waves as WaveIcon } from 'lucide-react';
import { TSong } from '../types/uge';

interface WavesTabProps {
  song: TSong;
  onUpdateWave: (waveIndex: number, samples: number[]) => void;
  onPreviewNote: (channel: number, note: number, inst: number) => void;
  colorTheme?: 'dark' | 'light';
}

export const WavesTab: React.FC<WavesTabProps> = ({ song, onUpdateWave, onPreviewNote, colorTheme = 'dark' }) => {
  const isLight = colorTheme === 'light';
  const [selectedWave, setSelectedWave] = useState<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  const samples = song.waves[selectedWave] || Array(32).fill(0);

  const handleBarClick = (sampleIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const height = rect.height;
    // 0 at bottom, 15 at top
    const val = Math.max(0, Math.min(15, Math.round(15 - (clickY / height) * 15)));
    const newSamples = [...samples];
    newSamples[sampleIndex] = val;
    onUpdateWave(selectedWave, newSamples);
  };

  const handleBarMouseMove = (sampleIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const height = rect.height;
    const val = Math.max(0, Math.min(15, Math.round(15 - (clickY / height) * 15)));
    const newSamples = [...samples];
    newSamples[sampleIndex] = val;
    onUpdateWave(selectedWave, newSamples);
  };

  // Presets
  const applyPreset = (type: string) => {
    const newSamples: number[] = [];
    for (let i = 0; i < 32; i++) {
      let val = 0;
      if (type === 'sine') {
        val = Math.round(7.5 + 7.5 * Math.sin((i / 32) * Math.PI * 2));
      } else if (type === 'triangle') {
        val = i < 16 ? Math.round((i / 16) * 15) : Math.round(((31 - i) / 16) * 15);
      } else if (type === 'saw') {
        val = Math.round((i / 31) * 15);
      } else if (type === 'square50') {
        val = i < 16 ? 15 : 0;
      } else if (type === 'square25') {
        val = i < 8 ? 15 : 0;
      } else if (type === 'organ') {
        const s1 = Math.sin((i / 32) * Math.PI * 2);
        const s2 = 0.5 * Math.sin((i / 32) * Math.PI * 4);
        const s3 = 0.25 * Math.sin((i / 32) * Math.PI * 8);
        val = Math.round(7.5 + 4.5 * (s1 + s2 + s3));
      } else if (type === 'invert') {
        val = 15 - (samples[i] ?? 0);
      } else if (type === 'clear') {
        val = 0;
      }
      newSamples.push(Math.max(0, Math.min(15, val)));
    }
    onUpdateWave(selectedWave, newSamples);
  };

  return (
    <div
      className={`flex h-full text-xs font-sans select-none overflow-hidden ${
        isLight ? 'bg-[#f0f2f5] text-slate-800' : 'bg-zinc-950 text-zinc-200'
      }`}
    >
      {/* Waveform Selector Sidebar */}
      <div
        className={`w-56 border-r flex flex-col shrink-0 ${
          isLight ? 'bg-[#e5e7eb] border-[#d1d5db]' : 'bg-zinc-900 border-zinc-800'
        }`}
      >
        <div
          className={`p-3 border-b font-mono font-bold flex items-center gap-2 ${
            isLight ? 'bg-white border-[#d1d5db] text-slate-800' : 'bg-zinc-950 border-zinc-800 text-zinc-300'
          }`}
        >
          <WaveIcon className="w-4 h-4 text-amber-500" />
          <span>WAVE BANK (16)</span>
        </div>

        <div
          className={`flex-1 overflow-y-auto divide-y font-mono ${
            isLight ? 'bg-white divide-slate-200' : 'divide-zinc-800/40'
          }`}
        >
          {Array.from({ length: 16 }, (_, idx) => {
            const isSelected = idx === selectedWave;
            return (
              <div
                key={idx}
                onClick={() => setSelectedWave(idx)}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer transition ${
                  isSelected
                    ? isLight
                      ? 'bg-amber-100 text-amber-950 font-bold border-l-2 border-amber-500'
                      : 'bg-zinc-800 text-white font-bold border-l-2 border-yellow-400'
                    : isLight
                    ? 'hover:bg-slate-100 text-slate-600'
                    : 'hover:bg-zinc-800/30 text-zinc-400'
                }`}
              >
                <span>Wave #{idx.toString().padStart(2, '0')}</span>
                {/* Mini preview sparkline */}
                <div
                  className={`flex items-end gap-0.5 h-3 w-12 px-0.5 py-0.5 rounded ${
                    isLight ? 'bg-slate-100' : 'bg-zinc-950'
                  }`}
                >
                  {(song.waves[idx] || []).filter((_, i) => i % 4 === 0).map((s, si) => (
                    <div
                      key={si}
                      className="w-1 bg-amber-500/80 rounded-xs"
                      style={{ height: `${Math.max(10, (s / 15) * 100)}%` }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Waveform Editor Canvas */}
      <div
        className={`flex-1 flex flex-col p-6 overflow-y-auto ${
          isLight ? 'bg-[#f8fafc]' : 'bg-zinc-950'
        }`}
        onMouseDown={() => {
          isDraggingRef.current = true;
        }}
        onMouseUp={() => {
          isDraggingRef.current = false;
        }}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between pb-4 border-b ${
            isLight ? 'border-slate-300' : 'border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`text-base font-bold font-mono ${
                isLight ? 'text-amber-700' : 'text-yellow-400'
              }`}
            >
              Waveform #{selectedWave.toString().padStart(2, '0')}
            </span>
            <span className={`font-mono text-xs ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
              32 samples × 4-bit resolution (0..15)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPreviewNote(2, 24, 1)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-900 font-bold rounded transition shadow-sm"
              title="Audition Waveform on CH3"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Audition (C-5)</span>
            </button>
          </div>
        </div>

        {/* Preset Generators */}
        <div
          className={`flex flex-wrap items-center gap-1.5 my-4 p-2 rounded-lg border ${
            isLight ? 'bg-white border-slate-300' : 'bg-zinc-900 border-zinc-800'
          }`}
        >
          <span
            className={`font-medium px-2 flex items-center gap-1 ${
              isLight ? 'text-slate-600' : 'text-zinc-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Presets:
          </span>
          {[
            { id: 'sine', label: 'Sine' },
            { id: 'triangle', label: 'Triangle' },
            { id: 'saw', label: 'Sawtooth' },
            { id: 'square50', label: 'Square 50%' },
            { id: 'square25', label: 'Square 25%' },
            { id: 'organ', label: 'Organ' },
            { id: 'invert', label: 'Invert' },
            { id: 'clear', label: 'Clear' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`px-2.5 py-1 rounded border transition font-mono ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* 32-Bar Visual Graph */}
        <div
          className={`border rounded-lg p-4 space-y-2 ${
            isLight ? 'bg-white border-slate-300' : 'bg-zinc-900 border-zinc-800'
          }`}
        >
          <div
            className={`h-64 flex items-end justify-between gap-1 p-3 rounded border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800/80'
            }`}
          >
            {samples.map((sample, sIdx) => {
              const heightPercent = Math.max(5, (sample / 15) * 100);
              return (
                <div
                  key={sIdx}
                  onMouseDown={(e) => handleBarClick(sIdx, e)}
                  onMouseEnter={(e) => handleBarMouseMove(sIdx, e)}
                  className="flex-1 h-full flex flex-col justify-end items-center cursor-pointer group"
                >
                  <div
                    className="w-full bg-yellow-500 group-hover:bg-yellow-400 transition-all rounded-t-xs"
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Hex Values Under Each Bar */}
          <div className="flex items-center justify-between text-center font-mono text-[11px] text-zinc-400">
            {samples.map((sample, sIdx) => (
              <span key={sIdx} className="flex-1 text-center">
                {sample.toString(16).toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        <p className="text-zinc-500 text-xs mt-3">
          Click or drag across the graph with the mouse to sculpt custom 4-bit Game Boy sound waveforms.
        </p>
      </div>
    </div>
  );
};
