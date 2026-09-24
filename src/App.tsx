import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Sliders,
  Waves,
  FileText,
  Play,
  Square,
  Volume2,
  Disc,
  Smartphone,
} from 'lucide-react';
import {
  TSong,
  createDefaultSong,
  createEmptyPattern,
  TDutyInstrument,
  TWaveInstrument,
  TNoiseInstrument,
  TCell,
} from './types/uge';
import { parseUgeBuffer } from './lib/ugeParser';
import { serializeUgeSong } from './lib/ugeSerializer';
import { audioEngine, PlaybackState } from './lib/audioEngine';
import { Toolbar } from './components/Toolbar';
import { OrderEditor } from './components/OrderEditor';
import { TrackerGrid } from './components/TrackerGrid';
import { InstrumentsTab } from './components/InstrumentsTab';
import { WavesTab } from './components/WavesTab';
import { GeneralTab } from './components/GeneralTab';
import { EffectEditorModal } from './components/EffectEditorModal';
import { GbdkExportModal } from './components/GbdkExportModal';
import { RenderSongModal } from './components/RenderSongModal';
import { ClassicHugeTrackerGui } from './components/ClassicHugeTrackerGui';
import { MobileHugeTrackerGui } from './components/MobileHugeTrackerGui';
import { FurnaceTrackerGui } from './components/FurnaceTrackerGui';

export default function App() {
  const [song, setSong] = useState<TSong>(createDefaultSong);
  const [activeTab, setActiveTab] = useState<'tracker' | 'instruments' | 'waves' | 'general'>('tracker');
  const [currentOrder, setCurrentOrder] = useState<number>(0);
  const [guiMode, setGuiMode] = useState<'modern' | 'classic' | 'furnace' | 'mobile'>('classic');

  // Auto-switch to mobile UI if screen is small on initial load or if user shrinks window
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      const saved = localStorage.getItem('hugetracker_gui_mode');
      if (!saved || saved === 'modern') {
        setGuiMode('mobile');
        localStorage.setItem('hugetracker_gui_mode', 'mobile');
      }
    }
  }, []);

  const handleSwitchGuiMode = (mode: 'modern' | 'classic' | 'furnace' | 'mobile') => {
    setGuiMode(mode);
    try {
      localStorage.setItem('hugetracker_gui_mode', mode);
    } catch {
      // ignore
    }
    const label =
      mode === 'classic'
        ? 'hUGETracker 1:1 Replica'
        : mode === 'furnace'
        ? 'Furnace Tracker GUI'
        : mode === 'mobile'
        ? 'Mobile DAW'
        : 'Modern Studio';
    showToast(`Switched to ${label}`);
  };

  // Playback state
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    orderIndex: 0,
    row: 0,
    tick: 0,
  });
  const [meters, setMeters] = useState<[number, number, number, number]>([0, 0, 0, 0]);

  // Theme toggle ('light' = Classic hUGETracker light blue-gray / 'dark' = Tango Dark)
  const [colorTheme, setColorTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('hugetracker_theme') as 'dark' | 'light') || 'light';
    } catch {
      return 'light';
    }
  });

  const handleToggleColorTheme = () => {
    setColorTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('hugetracker_theme', next);
      } catch {
        // ignore
      }
      showToast(`Color scheme: ${next === 'light' ? 'Classic Light' : 'Tango Dark'}`);
      return next;
    });
  };

  useEffect(() => {
    if (colorTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [colorTheme]);

  // Cursor in Tracker Grid
  const [cursorRow, setCursorRow] = useState<number>(0);
  const [cursorChannel, setCursorChannel] = useState<number>(0);
  const [cursorColumn, setCursorColumn] = useState<number>(0);

  // Tracker parameters
  const [currentOctave, setCurrentOctave] = useState<number>(5);
  const [currentInstrument, setCurrentInstrument] = useState<number>(1);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [masterVolume, setMasterVolume] = useState<number>(0.3);

  // Channel mute & solo
  const [mutedChannels, setMutedChannels] = useState<boolean[]>([false, false, false, false]);
  const [soloChannels, setSoloChannels] = useState<boolean[]>([false, false, false, false]);

  // Modals & notifications
  const [gbdkModalOpen, setGbdkModalOpen] = useState<boolean>(false);
  const [renderModalOpen, setRenderModalOpen] = useState<boolean>(false);
  const [undoStack, setUndoStack] = useState<TSong[]>([]);
  const [redoStack, setRedoStack] = useState<TSong[]>([]);

  const recordHistory = useCallback((prevSong: TSong) => {
    setUndoStack((prev) => [...prev.slice(-40), prevSong]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) {
        showToast('Nothing to undo');
        return prevUndo;
      }
      const previous = prevUndo[prevUndo.length - 1];
      const newUndo = prevUndo.slice(0, -1);
      setSong((currentSong) => {
        setRedoStack((prevRedo) => [...prevRedo, currentSong]);
        return previous;
      });
      showToast('Undo (Ctrl+Z)');
      return newUndo;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) {
        showToast('Nothing to redo');
        return prevRedo;
      }
      const nextSong = prevRedo[prevRedo.length - 1];
      const newRedo = prevRedo.slice(0, -1);
      setSong((currentSong) => {
        setUndoStack((prevUndo) => [...prevUndo, currentSong]);
        return nextSong;
      });
      showToast('Redo (Ctrl+Y)');
      return newRedo;
    });
  }, []);

  // Global keydown for Ctrl+Z and Ctrl+Y
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleUndo, handleRedo]);
  const [effectModal, setEffectModal] = useState<{
    isOpen: boolean;
    channel: number;
    row: number;
    code: number;
    params: number;
  }>({
    isOpen: false,
    channel: 0,
    row: 0,
    code: 0,
    params: 0,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync song with audio engine
  useEffect(() => {
    audioEngine.setSong(song);
  }, [song]);

  // Hook up audio engine callbacks
  useEffect(() => {
    audioEngine.setCallbacks(
      (state) => setPlaybackState(state),
      (chMeters) => setMeters(chMeters)
    );
    return () => {
      audioEngine.destroy();
    };
  }, []);

  // Load initial demo song on startup
  useEffect(() => {
    fetch('/sample-songs/Coffee Bat - Blue Ocean.uge')
      .then((res) => res.arrayBuffer())
      .then((buf) => {
        const loaded = parseUgeBuffer(buf);
        setSong(loaded);
        showToast('Loaded demo: "Coffee Bat - Blue Ocean" (V5)');
      })
      .catch((err) => {
        console.warn('Could not auto-load demo song:', err);
      });
  }, []);

  // Drag and drop .uge file support
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer?.files?.[0];
      if (file && (file.name.endsWith('.uge') || file.name.endsWith('.UGE'))) {
        try {
          const buf = await file.arrayBuffer();
          const loaded = parseUgeBuffer(buf);
          setSong(loaded);
          setCurrentOrder(0);
          showToast(`Opened "${file.name}" successfully!`);
        } catch (err: any) {
          showToast(`Error opening .uge: ${err.message}`);
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Playback handlers
  const handlePlay = (fromCursor = false) => {
    audioEngine.init();
    const startOrder = currentOrder;
    const startRow = fromCursor ? cursorRow : 0;
    audioEngine.play(startOrder, startRow);
  };

  const handleStop = () => {
    audioEngine.stop();
  };

  const handlePanic = () => {
    audioEngine.panic();
    showToast('Sound silenced.');
  };

  // Master volume
  const handleMasterVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    audioEngine.setMasterVolume(vol);
  };

  // Mute / Solo
  const handleToggleMute = (ch: number) => {
    const next = [...mutedChannels];
    next[ch] = !next[ch];
    setMutedChannels(next);
    audioEngine.setChannelMute(ch, next[ch]);
  };

  const handleToggleSolo = (ch: number) => {
    const next = [...soloChannels];
    next[ch] = !next[ch];
    setSoloChannels(next);
    audioEngine.setChannelSolo(ch, next[ch]);
  };

  // Note preview
  const handlePreviewNote = (channel: number, note: number, inst: number) => {
    audioEngine.previewNote(channel, note, inst);
  };

  // File operations
  const handleNewSong = () => {
    handleStop();
    const fresh = createDefaultSong();
    setSong(fresh);
    setCurrentOrder(0);
    showToast('Created new song.');
  };

  const handleLoadUgeFile = async (file: File) => {
    try {
      handleStop();
      const buf = await file.arrayBuffer();
      const loaded = parseUgeBuffer(buf);
      setSong(loaded);
      setCurrentOrder(0);
      showToast(`Loaded: "${file.name}"`);
    } catch (err: any) {
      showToast(`Failed to parse .uge: ${err.message}`);
    }
  };

  const handleLoadSampleSong = async (fileName: string) => {
    try {
      handleStop();
      const res = await fetch(`/sample-songs/${fileName}`);
      const buf = await res.arrayBuffer();
      const loaded = parseUgeBuffer(buf);
      setSong(loaded);
      setCurrentOrder(0);
      showToast(`Loaded sample song: ${fileName}`);
    } catch (err: any) {
      showToast(`Failed to load demo: ${err.message}`);
    }
  };

  const handleSaveUgeFile = () => {
    try {
      const bytes = serializeUgeSong(song);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${song.name.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'song'}.uge`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Saved song as .uge (v6 format)!');
    } catch (err: any) {
      showToast(`Error saving .uge: ${err.message}`);
    }
  };

  // Song update helper
  const handleUpdateSong = (updates: Partial<TSong>) => {
    recordHistory(song);
    setSong((prev) => ({ ...prev, ...updates }));
  };

  // Cell editing in current pattern
  const handleUpdateCell = (channel: number, row: number, updates: Partial<TCell>) => {
    recordHistory(song);
    setSong((prev) => {
      const patIdx = prev.orderMatrix[channel]?.[currentOrder] ?? 0;
      const prevPattern = prev.patterns[patIdx] ? [...prev.patterns[patIdx]] : createEmptyPattern();
      const prevCell = prevPattern[row] || {
        note: 90,
        instrument: 0,
        volume: 0,
        effectCode: 0,
        effectParams: 0,
      };
      prevPattern[row] = { ...prevCell, ...updates };

      return {
        ...prev,
        patterns: {
          ...prev.patterns,
          [patIdx]: prevPattern,
        },
      };
    });
  };

  // Order matrix mutations
  const handleInsertOrder = (atIndex: number, clonePatterns: boolean = false) => {
    recordHistory(song);
    setSong((prev) => {
      const newOrders: [number[], number[], number[], number[]] = [
        [...prev.orderMatrix[0]],
        [...prev.orderMatrix[1]],
        [...prev.orderMatrix[2]],
        [...prev.orderMatrix[3]],
      ];
      let nextPatterns = { ...prev.patterns };

      if (!clonePatterns) {
        // Reuse current pattern numbers
        for (let ch = 0; ch < 4; ch++) {
          const currentPat = prev.orderMatrix[ch]?.[atIndex] ?? 0;
          newOrders[ch].splice(atIndex + 1, 0, currentPat);
        }
      } else {
        // Find next unused pattern IDs and duplicate pattern data
        const usedIds = new Set(Object.keys(prev.patterns).map(Number));
        let nextId = 0;
        for (let ch = 0; ch < 4; ch++) {
          while (usedIds.has(nextId)) nextId++;
          usedIds.add(nextId);
          const currentPat = prev.orderMatrix[ch]?.[atIndex] ?? 0;
          const clonedData = prev.patterns[currentPat]
            ? JSON.parse(JSON.stringify(prev.patterns[currentPat]))
            : createEmptyPattern();
          nextPatterns[nextId] = clonedData;
          newOrders[ch].splice(atIndex + 1, 0, nextId);
        }
      }

      return {
        ...prev,
        patterns: nextPatterns,
        orderMatrix: newOrders,
      };
    });
    setCurrentOrder(atIndex + 1);
  };

  const handleDeleteOrder = (orderIndex: number) => {
    if (song.orderMatrix[0].length <= 1) return;
    recordHistory(song);
    setSong((prev) => {
      const newOrders: [number[], number[], number[], number[]] = [
        prev.orderMatrix[0].filter((_, i) => i !== orderIndex),
        prev.orderMatrix[1].filter((_, i) => i !== orderIndex),
        prev.orderMatrix[2].filter((_, i) => i !== orderIndex),
        prev.orderMatrix[3].filter((_, i) => i !== orderIndex),
      ];
      return { ...prev, orderMatrix: newOrders };
    });
    setCurrentOrder((prev) => Math.max(0, Math.min(orderIndex, song.orderMatrix[0].length - 2)));
  };

  const handleMoveOrder = (orderIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? orderIndex - 1 : orderIndex + 1;
    if (targetIndex < 0 || targetIndex >= song.orderMatrix[0].length) return;

    recordHistory(song);
    setSong((prev) => {
      const newOrders: [number[], number[], number[], number[]] = [
        [...prev.orderMatrix[0]],
        [...prev.orderMatrix[1]],
        [...prev.orderMatrix[2]],
        [...prev.orderMatrix[3]],
      ];
      for (let ch = 0; ch < 4; ch++) {
        const temp = newOrders[ch][orderIndex];
        newOrders[ch][orderIndex] = newOrders[ch][targetIndex];
        newOrders[ch][targetIndex] = temp;
      }
      return { ...prev, orderMatrix: newOrders };
    });
    setCurrentOrder(targetIndex);
  };

  const handleUpdateOrderCell = (ch: number, ordIdx: number, newPatIdx: number) => {
    recordHistory(song);
    setSong((prev) => {
      const newChOrders = [...prev.orderMatrix[ch]];
      newChOrders[ordIdx] = newPatIdx;
      const newMatrix: [number[], number[], number[], number[]] = [...prev.orderMatrix];
      newMatrix[ch] = newChOrders;

      // Ensure pattern exists
      const nextPatterns = { ...prev.patterns };
      if (!nextPatterns[newPatIdx]) {
        nextPatterns[newPatIdx] = createEmptyPattern();
      }
      return { ...prev, orderMatrix: newMatrix, patterns: nextPatterns };
    });
  };

  // Instrument updates
  const handleUpdateDutyInstrument = (index: number, updates: Partial<TDutyInstrument>) => {
    recordHistory(song);
    setSong((prev) => {
      const list = [...prev.dutyInstruments];
      list[index] = { ...list[index], ...updates };
      return { ...prev, dutyInstruments: list };
    });
  };

  const handleUpdateWaveInstrument = (index: number, updates: Partial<TWaveInstrument>) => {
    recordHistory(song);
    setSong((prev) => {
      const list = [...prev.waveInstruments];
      list[index] = { ...list[index], ...updates };
      return { ...prev, waveInstruments: list };
    });
  };

  const handleUpdateNoiseInstrument = (index: number, updates: Partial<TNoiseInstrument>) => {
    recordHistory(song);
    setSong((prev) => {
      const list = [...prev.noiseInstruments];
      list[index] = { ...list[index], ...updates };
      return { ...prev, noiseInstruments: list };
    });
  };

  // Waveform updates
  const handleUpdateWave = (waveIndex: number, samples: number[]) => {
    recordHistory(song);
    setSong((prev) => {
      const waves = [...prev.waves];
      waves[waveIndex] = samples;
      return { ...prev, waves };
    });
  };

  // Effect Helper open
  const handleOpenEffectHelper = (channel: number, row: number) => {
    const patIdx = song.orderMatrix[channel]?.[currentOrder] ?? 0;
    const cell = song.patterns[patIdx]?.[row];
    setEffectModal({
      isOpen: true,
      channel,
      row,
      code: cell ? cell.effectCode : 0,
      params: cell ? cell.effectParams : 0,
    });
  };

  // Effect Helper apply
  const handleApplyEffect = (code: number, params: number) => {
    handleUpdateCell(effectModal.channel, effectModal.row, {
      effectCode: code,
      effectParams: params,
    });
  };

  if (guiMode === 'classic') {
    return (
      <>
        <ClassicHugeTrackerGui
          song={song}
          onUpdateSong={handleUpdateSong}
          currentOrder={currentOrder}
          onSelectOrder={setCurrentOrder}
          onInsertOrder={handleInsertOrder}
          onDeleteOrder={handleDeleteOrder}
          onMoveOrder={handleMoveOrder}
          onUpdateOrderCell={handleUpdateOrderCell}
          playbackState={playbackState}
          meters={meters}
          onPlay={handlePlay}
          onStop={handleStop}
          onPanic={handlePanic}
          currentOctave={currentOctave}
          onOctaveChange={setCurrentOctave}
          currentInstrument={currentInstrument}
          onInstrumentChange={setCurrentInstrument}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          cursorRow={cursorRow}
          cursorChannel={cursorChannel}
          cursorColumn={cursorColumn}
          onCursorChange={(row, channel, column) => {
            setCursorRow(row);
            setCursorChannel(channel);
            setCursorColumn(column);
          }}
          onUpdateCell={handleUpdateCell}
          onPreviewNote={handlePreviewNote}
          onOpenEffectHelper={handleOpenEffectHelper}
          mutedChannels={mutedChannels}
          soloChannels={soloChannels}
          onToggleMute={handleToggleMute}
          onToggleSolo={handleToggleSolo}
          masterVolume={masterVolume}
          onMasterVolumeChange={handleMasterVolumeChange}
          onNewSong={handleNewSong}
          onLoadUgeFile={handleLoadUgeFile}
          onLoadSampleSong={handleLoadSampleSong}
          onSaveUgeFile={handleSaveUgeFile}
          onOpenGbdkExport={() => setGbdkModalOpen(true)}
          onSwitchGuiMode={handleSwitchGuiMode}
          onUpdateDutyInstrument={handleUpdateDutyInstrument}
          onUpdateWaveInstrument={handleUpdateWaveInstrument}
          onUpdateNoiseInstrument={handleUpdateNoiseInstrument}
          onUpdateWave={handleUpdateWave}
          colorTheme={colorTheme}
          onToggleColorTheme={handleToggleColorTheme}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onOpenRenderModal={() => setRenderModalOpen(true)}
        />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-zinc-900/95 border border-emerald-500/60 text-emerald-300 rounded shadow-xl text-xs font-mono flex items-center gap-2 backdrop-blur-xs">
            <Disc className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Render to WAV Modal */}
        <RenderSongModal
          isOpen={renderModalOpen}
          onClose={() => setRenderModalOpen(false)}
          song={song}
          isLight={colorTheme === 'light'}
        />

        {/* Effect Helper Modal */}
        <EffectEditorModal
          isOpen={effectModal.isOpen}
          onClose={() => setEffectModal((prev) => ({ ...prev, isOpen: false }))}
          channel={effectModal.channel}
          row={effectModal.row}
          currentCode={effectModal.code}
          currentParams={effectModal.params}
          onApplyEffect={handleApplyEffect}
        />

        {/* GBDK C Export Modal */}
        <GbdkExportModal
          isOpen={gbdkModalOpen}
          onClose={() => setGbdkModalOpen(false)}
          song={song}
        />
      </>
    );
  }

  // Mobile GUI Mode View
  if (guiMode === 'mobile') {
    return (
      <>
        <MobileHugeTrackerGui
          song={song}
          onUpdateSong={handleUpdateSong}
          currentOrder={currentOrder}
          onSelectOrder={setCurrentOrder}
          onInsertOrder={handleInsertOrder}
          onDeleteOrder={handleDeleteOrder}
          onMoveOrder={handleMoveOrder}
          onUpdateOrderCell={handleUpdateOrderCell}
          playbackState={playbackState}
          onPlay={handlePlay}
          onStop={handleStop}
          currentOctave={currentOctave}
          currentInstrument={currentInstrument}
          currentStep={currentStep}
          cursorRow={cursorRow}
          cursorChannel={cursorChannel}
          cursorColumn={cursorColumn}
          onCursorChange={(row, channel, column) => {
            setCursorRow(row);
            setCursorChannel(channel);
            setCursorColumn(column);
          }}
          onUpdateCell={handleUpdateCell}
          onPreviewNote={handlePreviewNote}
          onOpenEffectHelper={handleOpenEffectHelper}
          mutedChannels={mutedChannels}
          soloChannels={soloChannels}
          onToggleMute={handleToggleMute}
          onToggleSolo={handleToggleSolo}
          onExportGBDK={() => setGbdkModalOpen(true)}
          onSaveUGE={handleSaveUgeFile}
          onLoadUGE={handleLoadUgeFile}
          onLoadSampleSong={handleLoadSampleSong}
          onNewSong={handleNewSong}
          onSetOctave={setCurrentOctave}
          onSetInstrument={setCurrentInstrument}
          onSetStep={setCurrentStep}
          guiMode={guiMode}
          onToggleGuiMode={() => handleSwitchGuiMode('classic')}
          onSwitchGuiMode={handleSwitchGuiMode}
        />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-16 right-4 z-50 px-3 py-1.5 bg-zinc-900/95 border border-emerald-500/60 text-emerald-300 rounded shadow-xl text-xs font-mono flex items-center gap-2 backdrop-blur-xs">
            <Disc className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Effect Helper Modal */}
        <EffectEditorModal
          isOpen={effectModal.isOpen}
          onClose={() => setEffectModal((prev) => ({ ...prev, isOpen: false }))}
          channel={effectModal.channel}
          row={effectModal.row}
          currentCode={effectModal.code}
          currentParams={effectModal.params}
          onApplyEffect={handleApplyEffect}
        />

        {/* GBDK C Export Modal */}
        <GbdkExportModal
          isOpen={gbdkModalOpen}
          onClose={() => setGbdkModalOpen(false)}
          song={song}
        />
      </>
    );
  }

  // Furnace Tracker GUI Mode View
  if (guiMode === 'furnace') {
    return (
      <>
        <FurnaceTrackerGui
          song={song}
          onUpdateSong={handleUpdateSong}
          currentOrder={currentOrder}
          onSelectOrder={setCurrentOrder}
          onInsertOrder={handleInsertOrder}
          onDeleteOrder={handleDeleteOrder}
          onMoveOrder={handleMoveOrder}
          onUpdateOrderCell={handleUpdateOrderCell}
          playbackState={playbackState}
          meters={meters}
          onPlay={handlePlay}
          onStop={handleStop}
          onPanic={handlePanic}
          currentOctave={currentOctave}
          onOctaveChange={setCurrentOctave}
          currentInstrument={currentInstrument}
          onInstrumentChange={setCurrentInstrument}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          cursorRow={cursorRow}
          cursorChannel={cursorChannel}
          cursorColumn={cursorColumn}
          onCursorChange={(row, channel, column) => {
            setCursorRow(row);
            setCursorChannel(channel);
            setCursorColumn(column);
          }}
          onUpdateCell={handleUpdateCell}
          onPreviewNote={handlePreviewNote}
          onOpenEffectHelper={handleOpenEffectHelper}
          mutedChannels={mutedChannels}
          soloChannels={soloChannels}
          onToggleMute={handleToggleMute}
          onToggleSolo={handleToggleSolo}
          masterVolume={masterVolume}
          onMasterVolumeChange={handleMasterVolumeChange}
          onNewSong={handleNewSong}
          onLoadUgeFile={handleLoadUgeFile}
          onLoadSampleSong={handleLoadSampleSong}
          onSaveUgeFile={handleSaveUgeFile}
          onOpenGbdkExport={() => setGbdkModalOpen(true)}
          onSwitchGuiMode={handleSwitchGuiMode}
          onUpdateDutyInstrument={handleUpdateDutyInstrument}
          onUpdateWaveInstrument={handleUpdateWaveInstrument}
          onUpdateNoiseInstrument={handleUpdateNoiseInstrument}
          onUpdateWave={handleUpdateWave}
          colorTheme={colorTheme}
          onToggleColorTheme={handleToggleColorTheme}
        />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-zinc-900/95 border border-cyan-500/60 text-cyan-300 rounded shadow-xl text-xs font-mono flex items-center gap-2 backdrop-blur-xs">
            <Disc className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Effect Helper Modal */}
        <EffectEditorModal
          isOpen={effectModal.isOpen}
          onClose={() => setEffectModal((prev) => ({ ...prev, isOpen: false }))}
          channel={effectModal.channel}
          row={effectModal.row}
          currentCode={effectModal.code}
          currentParams={effectModal.params}
          onApplyEffect={handleApplyEffect}
        />

        {/* GBDK C Export Modal */}
        <GbdkExportModal
          isOpen={gbdkModalOpen}
          onClose={() => setGbdkModalOpen(false)}
          song={song}
        />
      </>
    );
  }

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans select-none ${
      colorTheme === 'light' ? 'bg-[#ece9d8] text-black' : 'bg-zinc-950 text-zinc-100'
    }`}>
      {/* Top Application Toolbar */}
      <Toolbar
        song={song}
        isPlaying={playbackState.isPlaying}
        onPlay={handlePlay}
        onStop={handleStop}
        onPanic={handlePanic}
        onNewSong={handleNewSong}
        onLoadUgeFile={handleLoadUgeFile}
        onLoadSampleSong={handleLoadSampleSong}
        onSaveUgeFile={handleSaveUgeFile}
        onOpenGbdkExport={() => setGbdkModalOpen(true)}
        currentOctave={currentOctave}
        onOctaveChange={setCurrentOctave}
        currentInstrument={currentInstrument}
        onInstrumentChange={setCurrentInstrument}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        activeChannel={cursorChannel}
        masterVolume={masterVolume}
        onMasterVolumeChange={handleMasterVolumeChange}
        meters={meters}
        onUpdateSong={handleUpdateSong}
        guiMode={guiMode}
        onToggleGuiMode={() => handleSwitchGuiMode('classic')}
        onSwitchGuiMode={handleSwitchGuiMode}
        colorTheme={colorTheme}
        onToggleColorTheme={handleToggleColorTheme}
      />

      {/* Main Tab Navigation Bar */}
      <nav className={`flex items-center justify-between px-3 border-b text-xs shrink-0 ${
        colorTheme === 'light' ? 'bg-[#e0ded0] border-[#abb7bc] text-gray-800' : 'bg-zinc-900/90 border-zinc-800 text-zinc-400'
      }`}>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('tracker')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition ${
              activeTab === 'tracker'
                ? colorTheme === 'light'
                  ? 'border-blue-600 text-blue-700 bg-white/60 font-bold'
                  : 'border-emerald-400 text-emerald-400 bg-zinc-800/40'
                : colorTheme === 'light'
                ? 'border-transparent text-gray-600 hover:text-black'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tracker Grid</span>
          </button>

          <button
            onClick={() => setActiveTab('instruments')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition ${
              activeTab === 'instruments'
                ? colorTheme === 'light'
                  ? 'border-blue-600 text-blue-700 bg-white/60 font-bold'
                  : 'border-emerald-400 text-emerald-400 bg-zinc-800/40'
                : colorTheme === 'light'
                ? 'border-transparent text-gray-600 hover:text-black'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Instruments & Macros</span>
          </button>

          <button
            onClick={() => setActiveTab('waves')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition ${
              activeTab === 'waves'
                ? colorTheme === 'light'
                  ? 'border-blue-600 text-blue-700 bg-white/60 font-bold'
                  : 'border-emerald-400 text-emerald-400 bg-zinc-800/40'
                : colorTheme === 'light'
                ? 'border-transparent text-gray-600 hover:text-black'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Wave Bank</span>
          </button>

          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition ${
              activeTab === 'general'
                ? colorTheme === 'light'
                  ? 'border-blue-600 text-blue-700 bg-white/60 font-bold'
                  : 'border-emerald-400 text-emerald-400 bg-zinc-800/40'
                : colorTheme === 'light'
                ? 'border-transparent text-gray-600 hover:text-black'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Song Properties</span>
          </button>
        </div>

        {/* Current Song Title & Artist Display */}
        <div className={`flex items-center gap-2 font-mono text-[11px] truncate ${
          colorTheme === 'light' ? 'text-gray-700' : 'text-zinc-400'
        }`}>
          <span className={`font-bold truncate ${colorTheme === 'light' ? 'text-black' : 'text-zinc-200'}`}>{song.name || 'Untitled'}</span>
          <span>by</span>
          <span className={`truncate font-semibold ${colorTheme === 'light' ? 'text-blue-700' : 'text-emerald-400'}`}>{song.artist || 'Unknown'}</span>
          <span className={colorTheme === 'light' ? 'text-gray-400' : 'text-zinc-600'}>|</span>
          <span>{song.ticksPerRow} ticks/row</span>
        </div>
      </nav>

      {/* Main Tab Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        {activeTab === 'tracker' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Order Matrix */}
            <OrderEditor
              song={song}
              currentOrder={currentOrder}
              playingOrder={playbackState.orderIndex}
              isPlaying={playbackState.isPlaying}
              onSelectOrder={setCurrentOrder}
              onInsertOrder={handleInsertOrder}
              onDeleteOrder={handleDeleteOrder}
              onMoveOrder={handleMoveOrder}
              onUpdateOrderCell={handleUpdateOrderCell}
            />

            {/* Right Column: 64-Row 4-Channel Tracker Grid */}
            <TrackerGrid
              song={song}
              currentOrder={playbackState.isPlaying ? playbackState.orderIndex : currentOrder}
              playingRow={playbackState.row}
              isPlaying={playbackState.isPlaying}
              currentOctave={currentOctave}
              currentInstrument={currentInstrument}
              currentStep={currentStep}
              cursorRow={cursorRow}
              cursorChannel={cursorChannel}
              cursorColumn={cursorColumn}
              onCursorChange={(row, channel, column) => {
                setCursorRow(row);
                setCursorChannel(channel);
                setCursorColumn(column);
              }}
              onUpdateCell={handleUpdateCell}
              onPreviewNote={handlePreviewNote}
              onOpenEffectHelper={handleOpenEffectHelper}
              mutedChannels={mutedChannels}
              soloChannels={soloChannels}
              onToggleMute={handleToggleMute}
              onToggleSolo={handleToggleSolo}
              meters={meters}
              onPlay={handlePlay}
              onStop={handleStop}
              colorTheme={colorTheme}
            />
          </div>
        )}

        {activeTab === 'instruments' && (
          <InstrumentsTab
            song={song}
            onUpdateDutyInstrument={handleUpdateDutyInstrument}
            onUpdateWaveInstrument={handleUpdateWaveInstrument}
            onUpdateNoiseInstrument={handleUpdateNoiseInstrument}
            onPreviewNote={handlePreviewNote}
            colorTheme={colorTheme}
          />
        )}

        {activeTab === 'waves' && (
          <WavesTab
            song={song}
            onUpdateWave={handleUpdateWave}
            onPreviewNote={handlePreviewNote}
            colorTheme={colorTheme}
          />
        )}

        {activeTab === 'general' && (
          <GeneralTab
            song={song}
            onUpdateSong={handleUpdateSong}
            colorTheme={colorTheme}
          />
        )}

        {/* Quick Mobile Mode Float button for phone viewports in Modern Desktop mode */}
        <button
          onClick={() => handleSwitchGuiMode('mobile')}
          className="md:hidden fixed bottom-4 left-4 z-40 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-2xl text-xs font-bold flex items-center gap-1.5 border border-emerald-300"
          title="Switch to touch-friendly Mobile DAW"
        >
          <Smartphone className="w-4 h-4" />
          <span>Switch to Mobile View</span>
        </button>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute bottom-4 right-4 z-50 px-4 py-2 bg-zinc-900/95 border border-emerald-500/60 text-emerald-300 rounded-lg shadow-xl text-xs font-mono flex items-center gap-2 backdrop-blur-xs animate-in fade-in slide-in-from-bottom-2">
            <Disc className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
            <span>{toastMessage}</span>
          </div>
        )}
      </main>

      {/* Effect Helper Modal */}
      <EffectEditorModal
        isOpen={effectModal.isOpen}
        onClose={() => setEffectModal((prev) => ({ ...prev, isOpen: false }))}
        channel={effectModal.channel}
        row={effectModal.row}
        currentCode={effectModal.code}
        currentParams={effectModal.params}
        onApplyEffect={handleApplyEffect}
      />

      {/* GBDK C Export Modal */}
      <GbdkExportModal
        isOpen={gbdkModalOpen}
        onClose={() => setGbdkModalOpen(false)}
        song={song}
      />
    </div>
  );
}
