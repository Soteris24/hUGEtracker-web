import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, HelpCircle } from 'lucide-react';

interface EffectEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: number;
  row: number;
  currentCode: number;
  currentParams: number;
  onApplyEffect: (code: number, params: number) => void;
}

export const EFFECT_INFO: Record<
  number,
  { name: string; desc: string; paramDesc: string; hex: string; category: string }
> = {
  0x0: {
    name: 'Arpeggio',
    desc: 'Rapidly cycles between the base note and offsets x and y (in semitones).',
    paramDesc: 'x: 2nd note (+semitones), y: 3rd note (+semitones)',
    hex: '0xy',
    category: 'Pitch',
  },
  0x1: {
    name: 'Portamento Up',
    desc: 'Slides pitch continuously upward every tick at speed xx.',
    paramDesc: 'xx: Slide speed (1..255)',
    hex: '1xx',
    category: 'Pitch',
  },
  0x2: {
    name: 'Portamento Down',
    desc: 'Slides pitch continuously downward every tick at speed xx.',
    paramDesc: 'xx: Slide speed (1..255)',
    hex: '2xx',
    category: 'Pitch',
  },
  0x3: {
    name: 'Tone Portamento',
    desc: 'Smoothly slides pitch towards the target note entered on this row.',
    paramDesc: 'xx: Slide speed (1..255)',
    hex: '3xx',
    category: 'Pitch',
  },
  0x4: {
    name: 'Vibrato',
    desc: 'Modulates pitch back and forth with speed x and depth y.',
    paramDesc: 'x: Speed (0..15), y: Depth (0..15)',
    hex: '4xy',
    category: 'Pitch',
  },
  0x5: {
    name: 'Master Volume',
    desc: 'Sets Game Boy hardware master output volume (NR50 register).',
    paramDesc: 'xx: Volume (0x00 to 0x77 for L/R channels)',
    hex: '5xx',
    category: 'Volume',
  },
  0x6: {
    name: 'Call Routine',
    desc: 'Calls a custom C/Assembly user routine (macros 0..7) on the Game Boy.',
    paramDesc: 'xx: Routine index (0..7)',
    hex: '6xx',
    category: 'System',
  },
  0x7: {
    name: 'Note Delay',
    desc: 'Delays triggering the note on this row by xx ticks.',
    paramDesc: 'xx: Ticks to wait before trigger (1..ticksPerRow-1)',
    hex: '7xx',
    category: 'Timing',
  },
  0x8: {
    name: 'Set Panning',
    desc: 'Controls stereo speaker routing (Left / Right / Center).',
    paramDesc: '0x10=Left, 0x01=Right, 0x11=Center (or full NR51 mask)',
    hex: '8xx',
    category: 'Panning',
  },
  0x9: {
    name: 'Set Timbre / Wave',
    desc: 'CH1/CH2: Square duty (0=12.5%, 1=25%, 2=50%, 3=75%). CH3: Waveform bank (0..15).',
    paramDesc: 'xx: Duty cycle (0..3) or Wave index (0..15)',
    hex: '9xx',
    category: 'Timbre',
  },
  0xa: {
    name: 'Volume Slide',
    desc: 'Slides volume up by x or down by y per tick.',
    paramDesc: 'x: Slide up speed, y: Slide down speed',
    hex: 'Axy',
    category: 'Volume',
  },
  0xb: {
    name: 'Position Jump',
    desc: 'Jumps directly to the specified order index in the song matrix.',
    paramDesc: 'xx: Target order index (0x00..0x7F)',
    hex: 'Bxx',
    category: 'Flow',
  },
  0xc: {
    name: 'Set Volume',
    desc: 'Instantly sets channel volume (0 = silent, 15 = maximum).',
    paramDesc: 'xx: Volume level (0..15 / 0x00..0x0F)',
    hex: 'Cxx',
    category: 'Volume',
  },
  0xd: {
    name: 'Pattern Break',
    desc: 'Breaks playback of current pattern and jumps to row xx of the next order.',
    paramDesc: 'xx: Target row index in next order (0x00..0x3F)',
    hex: 'Dxx',
    category: 'Flow',
  },
  0xe: {
    name: 'Note Cut',
    desc: 'Cuts the sound and silences the channel after xx ticks.',
    paramDesc: 'xx: Ticks before cut (0..ticksPerRow)',
    hex: 'Exx',
    category: 'Timing',
  },
  0xf: {
    name: 'Set Tempo',
    desc: 'Changes playback speed by setting ticks per row.',
    paramDesc: 'xx: Ticks per row (1..32)',
    hex: 'Fxx',
    category: 'Timing',
  },
};

export const EffectEditorModal: React.FC<EffectEditorModalProps> = ({
  isOpen,
  onClose,
  channel,
  row,
  currentCode,
  currentParams,
  onApplyEffect,
}) => {
  const [selectedEffect, setSelectedEffect] = useState<number>(currentCode || 0);
  const [param1, setParam1] = useState<number>((currentParams >> 4) & 0x0f);
  const [param2, setParam2] = useState<number>(currentParams & 0x0f);
  const [fullParam, setFullParam] = useState<number>(currentParams || 0);

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setSelectedEffect(currentCode || 0);
      setParam1((currentParams >> 4) & 0x0f);
      setParam2(currentParams & 0x0f);
      setFullParam(currentParams || 0);
    }
  }, [isOpen, currentCode, currentParams, channel, row]);

  if (!isOpen) return null;

  const handleApply = () => {
    let finalParams = fullParam;
    if (
      selectedEffect === 0x0 ||
      selectedEffect === 0x4 ||
      selectedEffect === 0xa
    ) {
      finalParams = ((param1 & 0x0f) << 4) | (param2 & 0x0f);
    }
    onApplyEffect(selectedEffect, finalParams);
    onClose();
  };

  const currentInfo = EFFECT_INFO[selectedEffect] || EFFECT_INFO[0];

  const computedParam =
    selectedEffect === 0x0 || selectedEffect === 0x4 || selectedEffect === 0xa
      ? ((param1 & 0x0f) << 4) | (param2 & 0x0f)
      : fullParam;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
      <div className="bg-[#ece9d8] dark:bg-zinc-900 border-2 border-[#7f9db9] dark:border-zinc-700 rounded shadow-2xl max-w-lg w-full overflow-hidden text-xs text-black dark:text-zinc-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#0055ea] to-[#3a93ff] text-white font-bold">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <h3 className="text-xs font-mono">
              Effect Helper - CH{channel + 1} (Row {row.toString().padStart(2, '0')})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-0.5 hover:bg-white/20 rounded text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
          {/* Effect Selector */}
          <div className="space-y-1">
            <label className="font-bold text-gray-800 dark:text-zinc-200">Select Effect Command</label>
            <select
              value={selectedEffect}
              onChange={(e) => {
                const code = parseInt(e.target.value, 10);
                setSelectedEffect(code);
                if (code === 0x8 && fullParam === 0) setFullParam(0x11);
              }}
              className="w-full px-2 py-1 bg-white dark:bg-zinc-950 border border-[#7f9db9] dark:border-zinc-700 rounded font-mono font-bold text-xs"
            >
              {Object.entries(EFFECT_INFO).map(([codeStr, info]) => {
                const code = parseInt(codeStr, 10);
                return (
                  <option key={code} value={code}>
                    {info.hex} - {info.name} ({info.category})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Effect Description Box */}
          <div className="p-2.5 bg-white dark:bg-zinc-950 border border-[#7f9db9] dark:border-zinc-800 rounded flex flex-col gap-1">
            <div className="flex items-center justify-between font-mono font-bold text-blue-700 dark:text-sky-400">
              <span>{currentInfo.hex}: {currentInfo.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded">
                {currentInfo.category}
              </span>
            </div>
            <p className="text-[11px] text-gray-700 dark:text-zinc-300">{currentInfo.desc}</p>
            <p className="text-[10px] text-gray-500 dark:text-zinc-400 italic">Format: {currentInfo.paramDesc}</p>
          </div>

          {/* Contextual Parameters Editor */}
          {selectedEffect === 0x0 && (
            <div className="p-3 bg-white dark:bg-zinc-950 rounded border border-[#7f9db9] dark:border-zinc-800 space-y-2.5">
              <span className="font-bold font-mono text-gray-800 dark:text-zinc-200">Arpeggio Offsets</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-600 dark:text-zinc-400">Note 2 (+semitones)</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={param1}
                    onChange={(e) => setParam1(Math.max(0, Math.min(15, parseInt(e.target.value, 10) || 0)))}
                    className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-400 dark:border-zinc-700 rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 dark:text-zinc-400">Note 3 (+semitones)</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={param2}
                    onChange={(e) => setParam2(Math.max(0, Math.min(15, parseInt(e.target.value, 10) || 0)))}
                    className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-400 dark:border-zinc-700 rounded font-mono font-bold"
                  />
                </div>
              </div>
              {/* Quick chord buttons */}
              <div className="flex flex-wrap gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setParam1(4);
                    setParam2(7);
                  }}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded text-[11px] font-semibold"
                >
                  Major (047)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setParam1(3);
                    setParam2(7);
                  }}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded text-[11px] font-semibold"
                >
                  Minor (037)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setParam1(4);
                    setParam2(11);
                  }}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded text-[11px] font-semibold"
                >
                  Maj7 (04B)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setParam1(7);
                    setParam2(12);
                  }}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded text-[11px] font-semibold"
                >
                  Octave (07C)
                </button>
              </div>
            </div>
          )}

          {selectedEffect === 0x4 && (
            <div className="p-3 bg-white dark:bg-zinc-950 rounded border border-[#7f9db9] dark:border-zinc-800 space-y-2.5">
              <span className="font-bold font-mono text-gray-800 dark:text-zinc-200">Vibrato Speed & Depth</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-600 dark:text-zinc-400">Speed (0..15)</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={param1}
                    onChange={(e) => setParam1(Math.max(0, Math.min(15, parseInt(e.target.value, 10) || 0)))}
                    className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-400 dark:border-zinc-700 rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 dark:text-zinc-400">Depth (0..15)</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={param2}
                    onChange={(e) => setParam2(Math.max(0, Math.min(15, parseInt(e.target.value, 10) || 0)))}
                    className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-400 dark:border-zinc-700 rounded font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedEffect === 0xa && (
            <div className="p-3 bg-white dark:bg-zinc-950 rounded border border-[#7f9db9] dark:border-zinc-800 space-y-2.5">
              <span className="font-bold font-mono text-gray-800 dark:text-zinc-200">Volume Slide (Up / Down)</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-600 dark:text-zinc-400">Slide Up Speed (x)</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={param1}
                    onChange={(e) => {
                      setParam1(Math.max(0, Math.min(15, parseInt(e.target.value, 10) || 0)));
                      if (parseInt(e.target.value, 10) > 0) setParam2(0);
                    }}
                    className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-400 dark:border-zinc-700 rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 dark:text-zinc-400">Slide Down Speed (y)</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={param2}
                    onChange={(e) => {
                      setParam2(Math.max(0, Math.min(15, parseInt(e.target.value, 10) || 0)));
                      if (parseInt(e.target.value, 10) > 0) setParam1(0);
                    }}
                    className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-400 dark:border-zinc-700 rounded font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedEffect === 0x8 && (
            <div className="p-3 bg-white dark:bg-zinc-950 rounded border border-[#7f9db9] dark:border-zinc-800 space-y-2.5">
              <span className="font-bold font-mono text-gray-800 dark:text-zinc-200">Speaker Panning</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFullParam(0x11)}
                  className={`py-2 rounded font-mono text-xs font-bold border transition ${
                    fullParam === 0x11
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-gray-100 dark:bg-zinc-900 text-gray-800 dark:text-zinc-300 border-gray-300 dark:border-zinc-700'
                  }`}
                >
                  Center (811)
                </button>
                <button
                  type="button"
                  onClick={() => setFullParam(0x10)}
                  className={`py-2 rounded font-mono text-xs font-bold border transition ${
                    fullParam === 0x10
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-gray-100 dark:bg-zinc-900 text-gray-800 dark:text-zinc-300 border-gray-300 dark:border-zinc-700'
                  }`}
                >
                  Left (810)
                </button>
                <button
                  type="button"
                  onClick={() => setFullParam(0x01)}
                  className={`py-2 rounded font-mono text-xs font-bold border transition ${
                    fullParam === 0x01
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-gray-100 dark:bg-zinc-900 text-gray-800 dark:text-zinc-300 border-gray-300 dark:border-zinc-700'
                  }`}
                >
                  Right (801)
                </button>
              </div>
            </div>
          )}

          {selectedEffect !== 0x0 && selectedEffect !== 0x4 && selectedEffect !== 0xa && selectedEffect !== 0x8 && (
            <div className="p-3 bg-white dark:bg-zinc-950 rounded border border-[#7f9db9] dark:border-zinc-800 space-y-2">
              <label className="block font-semibold text-gray-800 dark:text-zinc-200">
                Parameter Value (0x00 .. 0xFF / 0 .. 255)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={fullParam}
                  onChange={(e) => setFullParam(Math.max(0, Math.min(255, parseInt(e.target.value, 10) || 0)))}
                  className="w-24 px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-400 dark:border-zinc-700 rounded font-mono font-bold"
                />
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={fullParam}
                  onChange={(e) => setFullParam(parseInt(e.target.value, 10) || 0)}
                  className="flex-1 h-2 bg-gray-300 dark:bg-zinc-700 rounded cursor-pointer"
                />
                <span className="font-mono font-bold text-blue-700 dark:text-sky-400">
                  0x{fullParam.toString(16).toUpperCase().padStart(2, '0')}
                </span>
              </div>
            </div>
          )}

          {/* Effect Preview Badge */}
          <div className="p-2.5 bg-[#f5f3ec] dark:bg-zinc-950 rounded border border-[#7f9db9] dark:border-zinc-800 flex items-center justify-between font-mono">
            <span className="font-bold text-gray-700 dark:text-zinc-400">Tracker Cell Effect Code:</span>
            <span className="text-base font-black text-blue-800 dark:text-sky-400 px-2 py-0.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded">
              {selectedEffect.toString(16).toUpperCase()}
              {computedParam.toString(16).toUpperCase().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-[#ece9d8] dark:bg-zinc-950 border-t border-[#abb7bc] dark:border-zinc-800">
          <button
            onClick={onClose}
            className="px-3 py-1 bevel-button text-black dark:text-zinc-200 hover:bg-white text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-1 px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-[2px] font-bold text-xs shadow"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply to Cell</span>
          </button>
        </div>
      </div>
    </div>
  );
};
