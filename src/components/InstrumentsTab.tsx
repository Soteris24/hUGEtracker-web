import React, { useState } from 'react';
import {
  Volume2,
  Sliders,
  Play,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  TSong,
  TDutyInstrument,
  TWaveInstrument,
  TNoiseInstrument,
  TInstrument,
  TCell,
  NO_NOTE,
} from '../types/uge';

interface InstrumentsTabProps {
  song: TSong;
  onUpdateDutyInstrument: (index: number, updates: Partial<TDutyInstrument>) => void;
  onUpdateWaveInstrument: (index: number, updates: Partial<TWaveInstrument>) => void;
  onUpdateNoiseInstrument: (index: number, updates: Partial<TNoiseInstrument>) => void;
  onPreviewNote: (channel: number, note: number, inst: number) => void;
  colorTheme?: 'dark' | 'light';
}

export const InstrumentsTab: React.FC<InstrumentsTabProps> = ({
  song,
  onUpdateDutyInstrument,
  onUpdateWaveInstrument,
  onUpdateNoiseInstrument,
  onPreviewNote,
  colorTheme = 'dark',
}) => {
  const isLight = colorTheme === 'light';
  const [bankType, setBankType] = useState<0 | 1 | 2>(0); // 0=Duty, 1=Wave, 2=Noise
  const [selectedIndex, setSelectedIndex] = useState<number>(0); // 0..14
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'subpattern'>('params');

  const dutyInst = song.dutyInstruments[selectedIndex];
  const waveInst = song.waveInstruments[selectedIndex];
  const noiseInst = song.noiseInstruments[selectedIndex];

  const currentInst: TInstrument =
    bankType === 0 ? dutyInst : bankType === 1 ? waveInst : noiseInst;

  const handleAudition = (note = 24) => {
    // 24 = C-5
    const ch = bankType === 0 ? 0 : bankType === 1 ? 2 : 3;
    onPreviewNote(ch, note, selectedIndex + 1);
  };

  const updateSubpatternCell = (row: number, updates: Partial<TCell>) => {
    const prevSub = currentInst.subpattern ? [...currentInst.subpattern] : [];
    while (prevSub.length < 64) {
      prevSub.push({ note: NO_NOTE, instrument: 0, volume: 0, effectCode: 0, effectParams: 0 });
    }
    prevSub[row] = { ...prevSub[row], ...updates };

    if (bankType === 0) {
      onUpdateDutyInstrument(selectedIndex, { subpattern: prevSub });
    } else if (bankType === 1) {
      onUpdateWaveInstrument(selectedIndex, { subpattern: prevSub });
    } else {
      onUpdateNoiseInstrument(selectedIndex, { subpattern: prevSub });
    }
  };

  return (
    <div
      className={`flex h-full text-xs font-sans select-none overflow-hidden ${
        isLight ? 'bg-[#f0f2f5] text-slate-800' : 'bg-zinc-950 text-zinc-200'
      }`}
    >
      {/* Left Sidebar: Bank & 15 Instruments */}
      <div
        className={`w-64 border-r flex flex-col shrink-0 ${
          isLight ? 'bg-[#e5e7eb] border-[#d1d5db]' : 'bg-zinc-900 border-zinc-800'
        }`}
      >
        {/* Bank Type Switcher */}
        <div
          className={`grid grid-cols-3 p-2 border-b gap-1 ${
            isLight ? 'bg-white border-[#d1d5db]' : 'bg-zinc-950 border-zinc-800'
          }`}
        >
          <button
            onClick={() => {
              setBankType(0);
            }}
            className={`py-1.5 rounded font-mono font-medium transition ${
              bankType === 0
                ? isLight
                  ? 'bg-red-100 text-red-800 border border-red-300 font-bold'
                  : 'bg-red-950 text-red-300 border border-red-800'
                : isLight
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Duty
          </button>
          <button
            onClick={() => {
              setBankType(1);
            }}
            className={`py-1.5 rounded font-mono font-medium transition ${
              bankType === 1
                ? isLight
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                  : 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                : isLight
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Wave
          </button>
          <button
            onClick={() => {
              setBankType(2);
            }}
            className={`py-1.5 rounded font-mono font-medium transition ${
              bankType === 2
                ? isLight
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : isLight
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Noise
          </button>
        </div>

        {/* 15 Instruments List */}
        <div
          className={`flex-1 overflow-y-auto divide-y font-mono ${
            isLight ? 'bg-white divide-slate-200' : 'bg-zinc-900 divide-zinc-800/60'
          }`}
        >
          {Array.from({ length: 15 }, (_, idx) => {
            const inst =
              bankType === 0
                ? song.dutyInstruments[idx]
                : bankType === 1
                ? song.waveInstruments[idx]
                : song.noiseInstruments[idx];
            const isSelected = idx === selectedIndex;

            return (
              <div
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer transition ${
                  isSelected
                    ? isLight
                      ? 'bg-blue-100 text-blue-900 font-bold border-l-2 border-blue-600'
                      : 'bg-zinc-800 text-white font-bold border-l-2 border-emerald-400'
                    : isLight
                    ? 'hover:bg-slate-100 text-slate-700'
                    : 'hover:bg-zinc-800/40 text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`text-[11px] ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                    {(idx + 1).toString().padStart(2, '0')}:
                  </span>
                  <span className="truncate">{inst?.name || 'Untitled'}</span>
                </div>
                {inst?.subpatternEnabled && (
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded border ${
                      isLight
                        ? 'bg-purple-100 text-purple-800 border-purple-300'
                        : 'bg-purple-950 text-purple-300 border border-purple-800'
                    }`}
                  >
                    SUB
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Content Area: Instrument Inspector */}
      <div className={`flex-1 flex flex-col overflow-y-auto ${isLight ? 'bg-[#f8fafc]' : 'bg-zinc-950'}`}>
        {/* Inspector Header */}
        <div
          className={`flex items-center justify-between p-4 border-b shrink-0 ${
            isLight ? 'bg-white border-[#d1d5db]' : 'bg-zinc-900 border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-bold font-mono px-2 py-1 rounded border ${
                isLight
                  ? 'bg-slate-100 text-emerald-700 border-slate-300'
                  : 'bg-zinc-950 text-emerald-400 border-zinc-800'
              }`}
            >
              #{selectedIndex + 1}
            </span>
            <input
              type="text"
              value={currentInst?.name || ''}
              onChange={(e) => {
                if (bankType === 0) onUpdateDutyInstrument(selectedIndex, { name: e.target.value });
                else if (bankType === 1) onUpdateWaveInstrument(selectedIndex, { name: e.target.value });
                else onUpdateNoiseInstrument(selectedIndex, { name: e.target.value });
              }}
              placeholder="Instrument Name"
              className={`text-base font-bold px-3 py-1 rounded border focus:outline-none w-64 ${
                isLight
                  ? 'bg-white text-slate-900 border-slate-300 focus:border-blue-500'
                  : 'bg-zinc-950 text-zinc-100 border-zinc-800 focus:border-emerald-500'
              }`}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAudition(24)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded font-medium transition shadow-sm"
              title="Audition Note C-5 (Space / Enter)"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Test Note</span>
            </button>

            {/* Sub-tabs: Parameters vs Subpattern */}
            <div
              className={`flex p-0.5 rounded border ${
                isLight ? 'bg-slate-100 border-slate-300' : 'bg-zinc-950 border-zinc-800'
              }`}
            >
              <button
                onClick={() => setActiveSubTab('params')}
                className={`px-3 py-1 rounded text-xs transition ${
                  activeSubTab === 'params'
                    ? isLight
                      ? 'bg-white text-slate-900 font-medium shadow-xs'
                      : 'bg-zinc-800 text-zinc-100 font-medium'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Parameters
              </button>
              <button
                onClick={() => setActiveSubTab('subpattern')}
                className={`px-3 py-1 rounded text-xs transition ${
                  activeSubTab === 'subpattern'
                    ? isLight
                      ? 'bg-white text-slate-900 font-medium shadow-xs'
                      : 'bg-zinc-800 text-zinc-100 font-medium'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Subpattern
              </button>
            </div>
          </div>
        </div>

        {/* Parameters View */}
        {activeSubTab === 'params' && (
          <div className="p-6 space-y-6 max-w-4xl">
            {/* Common Length Settings */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                Length / Duration
              </h4>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentInst?.lengthEnabled || false}
                    onChange={(e) => {
                      const updates = { lengthEnabled: e.target.checked };
                      if (bankType === 0) onUpdateDutyInstrument(selectedIndex, updates);
                      else if (bankType === 1) onUpdateWaveInstrument(selectedIndex, updates);
                      else onUpdateNoiseInstrument(selectedIndex, updates);
                    }}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                  <span className="text-zinc-300 font-medium">Enable Sound Length</span>
                </label>

                {currentInst?.lengthEnabled && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400">Length value:</span>
                    <input
                      type="number"
                      min="0"
                      max={bankType === 1 ? 255 : 63}
                      value={currentInst?.length || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          const updates = { length: val };
                          if (bankType === 0) onUpdateDutyInstrument(selectedIndex, updates);
                          else if (bankType === 1) onUpdateWaveInstrument(selectedIndex, updates);
                          else onUpdateNoiseInstrument(selectedIndex, updates);
                        }
                      }}
                      className="w-20 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded font-mono text-zinc-200"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Bank Specific Controls */}
            {bankType === 0 && dutyInst && (
              <div className="space-y-6">
                {/* Duty & Envelope Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                    <Volume2 className="w-3.5 h-3.5 text-red-400" />
                    Duty Cycle & Volume Envelope
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Duty Cycle */}
                    <div className="space-y-1.5">
                      <label className="block text-zinc-400 font-medium">Duty Cycle</label>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { val: 0, label: '12.5%' },
                          { val: 1, label: '25%' },
                          { val: 2, label: '50%' },
                          { val: 3, label: '75%' },
                        ].map((d) => (
                          <button
                            key={d.val}
                            onClick={() => onUpdateDutyInstrument(selectedIndex, { duty: d.val as any })}
                            className={`py-1.5 rounded font-mono text-xs transition ${
                              dutyInst.duty === d.val
                                ? 'bg-red-600 text-white font-bold'
                                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Initial Volume */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-zinc-400">
                        <span>Initial Volume</span>
                        <span className="font-mono text-zinc-200">{dutyInst.initialVolume} / 15</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="15"
                        value={dutyInst.initialVolume}
                        onChange={(e) =>
                          onUpdateDutyInstrument(selectedIndex, { initialVolume: parseInt(e.target.value, 10) })
                        }
                        className="w-full accent-red-500 h-1.5 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>

                    {/* Envelope Direction */}
                    <div className="space-y-1.5">
                      <label className="block text-zinc-400 font-medium">Envelope Direction</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => onUpdateDutyInstrument(selectedIndex, { volSweepDirection: 1 })}
                          className={`py-1.5 rounded font-medium text-xs transition ${
                            dutyInst.volSweepDirection === 1
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                          }`}
                        >
                          Fade Out (Decay)
                        </button>
                        <button
                          onClick={() => onUpdateDutyInstrument(selectedIndex, { volSweepDirection: 0 })}
                          className={`py-1.5 rounded font-medium text-xs transition ${
                            dutyInst.volSweepDirection === 0
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                          }`}
                        >
                          Fade In (Attack)
                        </button>
                      </div>
                    </div>

                    {/* Envelope Sweep Step */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-zinc-400">
                        <span>Sweep Step (Speed)</span>
                        <span className="font-mono text-zinc-200">{dutyInst.volSweepAmount} (0 = off)</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="7"
                        value={dutyInst.volSweepAmount}
                        onChange={(e) =>
                          onUpdateDutyInstrument(selectedIndex, { volSweepAmount: parseInt(e.target.value, 10) })
                        }
                        className="w-full accent-red-500 h-1.5 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Pitch Sweep (NR10) Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Channel 1 Frequency Sweep (Hardware NR10)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-zinc-400 font-medium">Sweep Time</label>
                      <input
                        type="number"
                        min="0"
                        max="7"
                        value={dutyInst.sweepTime}
                        onChange={(e) =>
                          onUpdateDutyInstrument(selectedIndex, { sweepTime: parseInt(e.target.value, 10) || 0 })
                        }
                        className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded font-mono text-zinc-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-zinc-400 font-medium">Sweep Direction</label>
                      <select
                        value={dutyInst.sweepIncDec}
                        onChange={(e) =>
                          onUpdateDutyInstrument(selectedIndex, { sweepIncDec: parseInt(e.target.value, 10) as any })
                        }
                        className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-200"
                      >
                        <option value={0}>Increase Pitch (Up)</option>
                        <option value={1}>Decrease Pitch (Down)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-zinc-400 font-medium">Sweep Shift</label>
                      <input
                        type="number"
                        min="0"
                        max="7"
                        value={dutyInst.sweepShift}
                        onChange={(e) =>
                          onUpdateDutyInstrument(selectedIndex, { sweepShift: parseInt(e.target.value, 10) || 0 })
                        }
                        className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded font-mono text-zinc-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Wave Specific Controls */}
            {bankType === 1 && waveInst && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                  <Volume2 className="w-3.5 h-3.5 text-yellow-400" />
                  Wave Output Level & Selected Waveform
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Output Level */}
                  <div className="space-y-1.5">
                    <label className="block text-zinc-400 font-medium">Output Volume Level</label>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { val: 0, label: 'Mute (0%)' },
                        { val: 1, label: '100%' },
                        { val: 2, label: '50%' },
                        { val: 3, label: '25%' },
                      ].map((lvl) => (
                        <button
                          key={lvl.val}
                          onClick={() => onUpdateWaveInstrument(selectedIndex, { outputLevel: lvl.val as any })}
                          className={`py-1.5 rounded font-mono text-xs transition ${
                            waveInst.outputLevel === lvl.val
                              ? 'bg-yellow-600 text-black font-bold'
                              : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                          }`}
                        >
                          {lvl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Waveform Index */}
                  <div className="space-y-1.5">
                    <label className="block text-zinc-400 font-medium">Assigned Waveform Index</label>
                    <select
                      value={waveInst.waveform}
                      onChange={(e) =>
                        onUpdateWaveInstrument(selectedIndex, { waveform: parseInt(e.target.value, 10) })
                      }
                      className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 font-mono"
                    >
                      {Array.from({ length: 16 }, (_, wIdx) => (
                        <option key={wIdx} value={wIdx}>
                          Waveform #{wIdx}
                        </option>
                      ))}
                    </select>

                    {/* Waveform Mini Preview */}
                    <div className="mt-2 h-14 bg-zinc-950 border border-zinc-800 rounded p-1.5 flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 128 32" preserveAspectRatio="none">
                        <line x1="0" y1="16" x2="128" y2="16" stroke="#27272a" strokeDasharray="3,3" strokeWidth="0.8" />
                        {(() => {
                          const wSamples = song.waves[waveInst.waveform ?? 0] || Array(32).fill(0);
                          const points = wSamples.map((v, i) => `${(i / 31) * 128},${30 - (v / 15) * 28}`).join(' ');
                          return (
                            <>
                              <polyline fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
                              {wSamples.map((v, i) => (
                                <circle key={i} cx={(i / 31) * 128} cy={30 - (v / 15) * 28} r="1.2" fill="#facc15" />
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Noise Specific Controls */}
            {bankType === 2 && noiseInst && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  Noise LFSR & Volume Envelope
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* LFSR Mode */}
                  <div className="space-y-1.5">
                    <label className="block text-zinc-400 font-medium">Counter Step Width (LFSR Bit Length)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onUpdateNoiseInstrument(selectedIndex, { counterStep: 0 })}
                        className={`py-2 rounded font-medium text-xs transition ${
                          noiseInst.counterStep === 0
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold'
                            : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        15-Bit (Smooth White Noise)
                      </button>
                      <button
                        onClick={() => onUpdateNoiseInstrument(selectedIndex, { counterStep: 1 })}
                        className={`py-2 rounded font-medium text-xs transition ${
                          noiseInst.counterStep === 1
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold'
                            : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        7-Bit (Periodic Metallic Buzz)
                      </button>
                    </div>
                  </div>

                  {/* Initial Volume */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-zinc-400">
                      <span>Initial Volume</span>
                      <span className="font-mono text-zinc-200">{noiseInst.initialVolume} / 15</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={noiseInst.initialVolume}
                      onChange={(e) =>
                        onUpdateNoiseInstrument(selectedIndex, { initialVolume: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>

                  {/* Sweep Direction */}
                  <div className="space-y-1.5">
                    <label className="block text-zinc-400 font-medium">Envelope Direction</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onUpdateNoiseInstrument(selectedIndex, { volSweepDirection: 1 })}
                        className={`py-1.5 rounded font-medium text-xs transition ${
                          noiseInst.volSweepDirection === 1
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        Fade Out (Decay)
                      </button>
                      <button
                        onClick={() => onUpdateNoiseInstrument(selectedIndex, { volSweepDirection: 0 })}
                        className={`py-1.5 rounded font-medium text-xs transition ${
                          noiseInst.volSweepDirection === 0
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        Fade In (Attack)
                      </button>
                    </div>
                  </div>

                  {/* Sweep Step */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-zinc-400">
                      <span>Sweep Step (Speed)</span>
                      <span className="font-mono text-zinc-200">{noiseInst.volSweepAmount} (0 = off)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="7"
                      value={noiseInst.volSweepAmount}
                      onChange={(e) =>
                        onUpdateNoiseInstrument(selectedIndex, { volSweepAmount: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subpattern View */}
        {activeSubTab === 'subpattern' && (
          <div className="p-6 space-y-4 max-w-4xl">
            <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentInst?.subpatternEnabled || false}
                  onChange={(e) => {
                    const updates = { subpatternEnabled: e.target.checked };
                    if (bankType === 0) onUpdateDutyInstrument(selectedIndex, updates);
                    else if (bankType === 1) onUpdateWaveInstrument(selectedIndex, updates);
                    else onUpdateNoiseInstrument(selectedIndex, updates);
                  }}
                  className="w-4 h-4 accent-purple-500 rounded"
                />
                <div>
                  <span className="text-zinc-100 font-bold text-sm">Enable Instrument Subpattern (Macro)</span>
                  <p className="text-zinc-400 text-xs">
                    Cycles semitone offsets, arpeggios, and hardware register changes on every single tick.
                  </p>
                </div>
              </label>
            </div>

            {/* Subpattern 64-Row Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <div className="grid grid-cols-[3rem_1fr_1fr_1fr] bg-zinc-950 p-2 text-zinc-400 font-mono font-bold text-center border-b border-zinc-800">
                <div>ROW</div>
                <div>NOTE OFFSET</div>
                <div>JUMP TO ROW</div>
                <div>EFFECT</div>
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-zinc-800/40 font-mono">
                {Array.from({ length: 64 }, (_, r) => {
                  const cell = currentInst?.subpattern?.[r] || {
                    note: NO_NOTE,
                    instrument: 0,
                    volume: 0,
                    effectCode: 0,
                    effectParams: 0,
                  };

                  return (
                    <div
                      key={r}
                      className="grid grid-cols-[3rem_1fr_1fr_1fr] items-center p-1 text-center hover:bg-zinc-800/30"
                    >
                      <div className="text-zinc-500">{r.toString().padStart(2, '0')}</div>

                      {/* Note offset */}
                      <div>
                        <input
                          type="number"
                          min="-36"
                          max="36"
                          value={cell.note === NO_NOTE ? '' : cell.note}
                          placeholder="--"
                          onChange={(e) => {
                            const val = e.target.value === '' ? NO_NOTE : parseInt(e.target.value, 10);
                            updateSubpatternCell(r, { note: val });
                          }}
                          className="w-16 text-center bg-zinc-950 border border-zinc-800 rounded py-0.5 text-purple-300"
                        />
                      </div>

                      {/* Jump */}
                      <div>
                        <input
                          type="number"
                          min="0"
                          max="64"
                          value={cell.volume || ''}
                          placeholder="0"
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            updateSubpatternCell(r, { volume: val });
                          }}
                          className="w-16 text-center bg-zinc-950 border border-zinc-800 rounded py-0.5 text-amber-300"
                        />
                      </div>

                      {/* Effect Code & Params */}
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="text"
                          maxLength={1}
                          value={cell.effectCode ? cell.effectCode.toString(16).toUpperCase() : ''}
                          placeholder="."
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 16) || 0;
                            updateSubpatternCell(r, { effectCode: val });
                          }}
                          className="w-8 text-center bg-zinc-950 border border-zinc-800 rounded py-0.5 text-sky-300"
                        />
                        <input
                          type="text"
                          maxLength={2}
                          value={cell.effectParams ? cell.effectParams.toString(16).toUpperCase().padStart(2, '0') : ''}
                          placeholder=".."
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 16) || 0;
                            updateSubpatternCell(r, { effectParams: val });
                          }}
                          className="w-10 text-center bg-zinc-950 border border-zinc-800 rounded py-0.5 text-sky-300"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
