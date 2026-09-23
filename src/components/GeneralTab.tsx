import React from 'react';
import { Music, User, MessageSquare, Clock, BarChart3, Cpu } from 'lucide-react';
import { TSong } from '../types/uge';

interface GeneralTabProps {
  song: TSong;
  onUpdateSong: (updates: Partial<TSong>) => void;
  colorTheme?: 'dark' | 'light';
}

export const GeneralTab: React.FC<GeneralTabProps> = ({ song, onUpdateSong, colorTheme = 'dark' }) => {
  const isLight = colorTheme === 'light';
  const patternCount = Object.keys(song.patterns).length;
  const orderCount = Math.max(
    song.orderMatrix[0]?.length || 1,
    song.orderMatrix[1]?.length || 1,
    song.orderMatrix[2]?.length || 1,
    song.orderMatrix[3]?.length || 1
  );

  // Calculate accurate tick rate and BPM
  const tickRate = song.timerEnabled
    ? 4096 / Math.max(1, 256 - (song.timerDivider ?? 0))
    : 59.7275;
  const calculatedBpm = ((tickRate * 60) / (4 * Math.max(1, song.ticksPerRow))).toFixed(1);

  return (
    <div
      className={`p-6 max-w-4xl mx-auto font-sans text-xs space-y-6 ${
        isLight ? 'text-slate-800' : 'text-zinc-300'
      }`}
    >
      {/* Song Metadata Card */}
      <div
        className={`border rounded-lg p-5 shadow-sm space-y-4 ${
          isLight ? 'bg-white border-slate-300' : 'bg-zinc-900 border-zinc-800'
        }`}
      >
        <h3
          className={`text-sm font-bold uppercase tracking-wider font-mono flex items-center gap-2 border-b pb-2 ${
            isLight ? 'text-slate-900 border-slate-200' : 'text-zinc-100 border-zinc-800'
          }`}
        >
          <Music className="w-4 h-4 text-emerald-500" />
          Song Metadata
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={`block font-medium ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
              Song Name
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={255}
                value={song.name}
                onChange={(e) => onUpdateSong({ name: e.target.value })}
                placeholder="Untitled Song"
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 focus:border-emerald-600 text-slate-900'
                    : 'bg-zinc-950 border-zinc-800 focus:border-emerald-500 text-zinc-100'
                }`}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className={`block font-medium ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
              Artist / Composer
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={255}
                value={song.artist}
                onChange={(e) => onUpdateSong({ artist: e.target.value })}
                placeholder="Unknown Artist"
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 focus:border-emerald-600 text-slate-900'
                    : 'bg-zinc-950 border-zinc-800 focus:border-emerald-500 text-zinc-100'
                }`}
              />
            </div>
          </div>

          <div className="col-span-full space-y-1">
            <label className={`block font-medium ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
              Comments / Notes
            </label>
            <textarea
              rows={3}
              maxLength={255}
              value={song.comment}
              onChange={(e) => onUpdateSong({ comment: e.target.value })}
              placeholder="Add song notes or details..."
              className={`w-full px-3 py-2 border rounded text-xs focus:outline-none resize-none font-mono ${
                isLight
                  ? 'bg-slate-50 border-slate-300 focus:border-emerald-600 text-slate-900'
                  : 'bg-zinc-950 border-zinc-800 focus:border-emerald-500 text-zinc-100'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Playback Tempo & Timing Card */}
      <div
        className={`border rounded-lg p-5 shadow-sm space-y-4 ${
          isLight ? 'bg-white border-slate-300' : 'bg-zinc-900 border-zinc-800'
        }`}
      >
        <h3
          className={`text-sm font-bold uppercase tracking-wider font-mono flex items-center gap-2 border-b pb-2 ${
            isLight ? 'text-slate-900 border-slate-200' : 'text-zinc-100 border-zinc-800'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-500" />
          Tempo & Game Boy Timer Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={`block font-medium ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
              Ticks Per Row (Speed)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="32"
                value={song.ticksPerRow}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) onUpdateSong({ ticksPerRow: Math.max(1, Math.min(32, val)) });
                }}
                className={`w-24 px-3 py-1.5 border rounded font-mono text-sm ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 focus:border-amber-600 text-slate-900'
                    : 'bg-zinc-950 border-zinc-800 focus:border-amber-500 text-zinc-100'
                }`}
              />
              <span className="text-amber-500 font-mono font-bold">
                {calculatedBpm} BPM
              </span>
            </div>
            <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
              Number of driver ticks per tracker row. {song.timerEnabled ? `Timer is ticking at ${tickRate.toFixed(1)} Hz.` : 'Uses default Game Boy VBlank refresh rate (~59.73 Hz).'}
            </p>
          </div>

          <div
            className={`space-y-3 p-3.5 rounded border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950/60 border-zinc-800/80'
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="timer-enabled"
                checked={song.timerEnabled}
                onChange={(e) => onUpdateSong({ timerEnabled: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <label
                htmlFor="timer-enabled"
                className={`font-medium cursor-pointer ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}
              >
                Enable Hardware Timer Interrupt (TMA)
              </label>
            </div>

            {song.timerEnabled && (
              <div className={`space-y-2 pt-1 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800/60'}`}>
                <div className="flex items-center justify-between">
                  <label className={`block font-medium ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                    Timer Divider (TMA: 0..255)
                  </label>
                  <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Freq: {tickRate.toFixed(1)} Hz
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={song.timerDivider}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) onUpdateSong({ timerDivider: Math.max(0, Math.min(255, val)) });
                  }}
                  className={`w-28 px-3 py-1.5 border rounded font-mono text-sm ${
                    isLight
                      ? 'bg-white border-slate-300 focus:border-amber-600 text-slate-900'
                      : 'bg-zinc-950 border-zinc-800 focus:border-amber-500 text-zinc-100'
                  }`}
                />
                <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                  Game Boy Timer runs at 4096 Hz. Tick interval = 4096 / (256 - TMA).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Song Statistics Card */}
      <div
        className={`border rounded-lg p-5 shadow-sm space-y-4 ${
          isLight ? 'bg-white border-slate-300' : 'bg-zinc-900 border-zinc-800'
        }`}
      >
        <h3
          className={`text-sm font-bold uppercase tracking-wider font-mono flex items-center gap-2 border-b pb-2 ${
            isLight ? 'text-slate-900 border-slate-200' : 'text-zinc-100 border-zinc-800'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-sky-500" />
          Song Statistics & Memory Footprint
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            className={`p-3 rounded border text-center ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
            }`}
          >
            <div className="text-lg font-bold font-mono text-emerald-600">{patternCount}</div>
            <div className={`text-[11px] uppercase tracking-wide ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Unique Patterns
            </div>
          </div>
          <div
            className={`p-3 rounded border text-center ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
            }`}
          >
            <div className="text-lg font-bold font-mono text-amber-600">{orderCount}</div>
            <div className={`text-[11px] uppercase tracking-wide ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Song Orders
            </div>
          </div>
          <div
            className={`p-3 rounded border text-center ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
            }`}
          >
            <div className="text-lg font-bold font-mono text-sky-600">45</div>
            <div className={`text-[11px] uppercase tracking-wide ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Instruments
            </div>
          </div>
          <div
            className={`p-3 rounded border text-center ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
            }`}
          >
            <div className="text-lg font-bold font-mono text-purple-600">16</div>
            <div className={`text-[11px] uppercase tracking-wide ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Custom Waves
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
