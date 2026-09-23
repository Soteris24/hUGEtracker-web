/**
 * hUGETracker UGE data types & definitions
 */

export const NO_NOTE = 90;

export interface TCell {
  note: number; // 0..71 (C-3 to B-8), or 90 for NO_NOTE
  instrument: number; // 0..15 (0 = none)
  volume: number; // 0..32 (used in subpatterns or cell vol)
  effectCode: number; // 0..15 (0x0..0xF)
  effectParams: number; // 0..255 (0x00..0xFF)
}

export type TPattern = TCell[];

export interface TDutyInstrument {
  type: 0;
  name: string;
  length: number;
  lengthEnabled: boolean;
  initialVolume: number; // 0..15
  volSweepDirection: 0 | 1; // 0 = up, 1 = down
  volSweepAmount: number; // 0..7
  sweepTime: number; // 0..7
  sweepIncDec: 0 | 1; // 0 = up, 1 = down
  sweepShift: number; // 0..7
  duty: number; // 0 = 12.5%, 1 = 25%, 2 = 50%, 3 = 75%
  subpatternEnabled: boolean;
  subpattern: TPattern;
}

export interface TWaveInstrument {
  type: 1;
  name: string;
  length: number;
  lengthEnabled: boolean;
  outputLevel: number; // 0 = Mute, 1 = 100%, 2 = 50%, 3 = 25%
  waveform: number; // 0..15
  subpatternEnabled: boolean;
  subpattern: TPattern;
}

export interface TNoiseInstrument {
  type: 2;
  name: string;
  length: number;
  lengthEnabled: boolean;
  initialVolume: number; // 0..15
  volSweepDirection: 0 | 1; // 0 = up, 1 = down
  volSweepAmount: number; // 0..7
  counterStep: 0 | 1; // 0 = 15-bit (white noise), 1 = 7-bit (metallic/buzz)
  noiseMacro: number[]; // 6 elements (v4/v5 legacy)
  subpatternEnabled: boolean;
  subpattern: TPattern;
}

export type TInstrument = TDutyInstrument | TWaveInstrument | TNoiseInstrument;

export type TWaveBank = number[][]; // 16 waves, each 32 samples (0..15)

export interface TSong {
  version: number;
  name: string;
  artist: string;
  comment: string;
  dutyInstruments: TDutyInstrument[]; // 15 instruments
  waveInstruments: TWaveInstrument[]; // 15 instruments
  noiseInstruments: TNoiseInstrument[]; // 15 instruments
  waves: TWaveBank; // 16 waves
  ticksPerRow: number;
  timerEnabled: boolean;
  timerDivider: number;
  patterns: Record<number, TPattern>;
  orderMatrix: [number[], number[], number[], number[]];
  routines: string[]; // 16 strings
}

// 72 notes from C-3 to B-8
export const NOTE_NAMES = [
  'C-3', 'C#3', 'D-3', 'D#3', 'E-3', 'F-3', 'F#3', 'G-3', 'G#3', 'A-3', 'A#3', 'B-3',
  'C-4', 'C#4', 'D-4', 'D#4', 'E-4', 'F-4', 'F#4', 'G-4', 'G#4', 'A-4', 'A#4', 'B-4',
  'C-5', 'C#5', 'D-5', 'D#5', 'E-5', 'F-5', 'F#5', 'G-5', 'G#5', 'A-5', 'A#5', 'B-5',
  'C-6', 'C#6', 'D-6', 'D#6', 'E-6', 'F-6', 'F#6', 'G-6', 'G#6', 'A-6', 'A#6', 'B-6',
  'C-7', 'C#7', 'D-7', 'D#7', 'E-7', 'F-7', 'F#7', 'G-7', 'G#7', 'A-7', 'A#7', 'B-7',
  'C-8', 'C#8', 'D-8', 'D#8', 'E-8', 'F-8', 'F#8', 'G-8', 'G#8', 'A-8', 'A#8', 'B-8',
];

export const NOTE_C_NAMES = [
  'C_3', 'Cs3', 'D_3', 'Ds3', 'E_3', 'F_3', 'Fs3', 'G_3', 'Gs3', 'A_3', 'As3', 'B_3',
  'C_4', 'Cs4', 'D_4', 'Ds4', 'E_4', 'F_4', 'Fs4', 'G_4', 'Gs4', 'A_4', 'As4', 'B_4',
  'C_5', 'Cs5', 'D_5', 'Ds5', 'E_5', 'F_5', 'Fs5', 'G_5', 'Gs5', 'A_5', 'As5', 'B_5',
  'C_6', 'Cs6', 'D_6', 'Ds6', 'E_6', 'F_6', 'Fs6', 'G_6', 'Gs6', 'A_6', 'As6', 'B_6',
  'C_7', 'Cs7', 'D_7', 'Ds7', 'E_7', 'F_7', 'Fs7', 'G_7', 'Gs7', 'A_7', 'As7', 'B_7',
  'C_8', 'Cs8', 'D_8', 'Ds8', 'E_8', 'F_8', 'Fs8', 'G_8', 'Gs8', 'A_8', 'As8', 'B_8',
];

// Game Boy Period values for notes (frequencies for duty and wave channels)
// Game Boy CPU frequency 4194304 Hz; 131072 / (2048 - period) for Square; 65536 / (2048 - period) for Wave
export const GB_NOTE_PERIODS: number[] = [
  44, 156, 262, 363, 457, 547, 631, 710, 786, 854, 923, 986,
  1046, 1102, 1155, 1205, 1253, 1297, 1339, 1379, 1417, 1452, 1486, 1517,
  1546, 1575, 1602, 1627, 1650, 1673, 1694, 1714, 1732, 1750, 1767, 1783,
  1798, 1812, 1825, 1837, 1849, 1860, 1871, 1881, 1890, 1899, 1907, 1915,
  1923, 1930, 1936, 1943, 1949, 1954, 1959, 1964, 1969, 1974, 1978, 1982,
  1985, 1988, 1992, 1995, 1998, 2001, 2004, 2006, 2009, 2011, 2013, 2015,
];

// Noise channel frequency code mapping (note 0..71 -> NR43 register bits / divider)
export const NOISE_FREQS: number[] = [
  // 72 entries matching hUGETracker constants
  524288, 262144, 131072, 87381, 65536, 52428, 43690, 37449,
  32768, 26214, 21845, 18724, 16384, 13107, 10922, 9362,
  8192, 6553, 5461, 4681, 4096, 3276, 2730, 2340,
  2048, 1638, 1365, 1170, 1024, 819, 682, 585,
  512, 409, 341, 292, 256, 204, 170, 146,
  128, 102, 85, 73, 64, 51, 42, 36,
  32, 25, 21, 18, 16, 12, 10, 9,
  8, 6, 5, 4, 4, 3, 2, 2,
  2, 1, 1, 1, 1, 1, 1, 1,
];

export interface TrackerCursor {
  row: number; // 0..63
  channel: number; // 0..3 (CH1..CH4)
  column: 'note' | 'instrument' | 'effectCode' | 'effectParam';
  orderIndex: number;
}

export function createEmptyCell(): TCell {
  return {
    note: NO_NOTE,
    instrument: 0,
    volume: 0,
    effectCode: 0,
    effectParams: 0,
  };
}

export function createEmptyPattern(): TPattern {
  const pattern: TPattern = [];
  for (let i = 0; i < 64; i++) {
    pattern.push(createEmptyCell());
  }
  return pattern;
}

export function createDefaultDutyInstrument(name = 'Duty', duty = 2): TDutyInstrument {
  return {
    type: 0,
    name,
    length: 0,
    lengthEnabled: false,
    initialVolume: 15,
    volSweepDirection: 1, // down
    volSweepAmount: 0, // no sweep
    sweepTime: 0,
    sweepIncDec: 0,
    sweepShift: 0,
    duty,
    subpatternEnabled: false,
    subpattern: createEmptyPattern(),
  };
}

export function createDefaultWaveInstrument(name = 'Wave', waveform = 0): TWaveInstrument {
  return {
    type: 1,
    name,
    length: 0,
    lengthEnabled: false,
    outputLevel: 1, // 100%
    waveform,
    subpatternEnabled: false,
    subpattern: createEmptyPattern(),
  };
}

export function createDefaultNoiseInstrument(name = 'Noise'): TNoiseInstrument {
  return {
    type: 2,
    name,
    length: 0,
    lengthEnabled: false,
    initialVolume: 15,
    volSweepDirection: 1,
    volSweepAmount: 3,
    counterStep: 0, // 15-bit
    noiseMacro: [0, 0, 0, 0, 0, 0],
    subpatternEnabled: false,
    subpattern: createEmptyPattern(),
  };
}

export function createDefaultWaves(): TWaveBank {
  const waves: TWaveBank = [];
  for (let w = 0; w < 16; w++) {
    const wave: number[] = [];
    if (w === 0) {
      // Triangle
      for (let i = 0; i < 16; i++) wave.push(i);
      for (let i = 15; i >= 0; i--) wave.push(i);
    } else if (w === 1) {
      // Sawtooth
      for (let i = 0; i < 32; i++) wave.push(Math.floor(i / 2));
    } else if (w === 2) {
      // Square 50%
      for (let i = 0; i < 16; i++) wave.push(15);
      for (let i = 0; i < 16; i++) wave.push(0);
    } else if (w === 3) {
      // Sine wave approximation
      for (let i = 0; i < 32; i++) {
        const val = Math.round(7.5 + 7.5 * Math.sin((i / 32) * Math.PI * 2));
        wave.push(Math.min(15, Math.max(0, val)));
      }
    } else {
      // Flat low
      for (let i = 0; i < 32; i++) wave.push(w % 2 === 0 ? 8 : (i % 2 === 0 ? 12 : 2));
    }
    waves.push(wave);
  }
  return waves;
}

export function createNewSong(title = 'Untitled Song', artist = 'Composer'): TSong {

  const dutyInstruments: TDutyInstrument[] = [];
  for (let i = 1; i <= 15; i++) {
    dutyInstruments.push(createDefaultDutyInstrument(`Duty ${i}`, (i % 4)));
  }

  const waveInstruments: TWaveInstrument[] = [];
  for (let i = 1; i <= 15; i++) {
    waveInstruments.push(createDefaultWaveInstrument(`Wave ${i}`, (i - 1) % 16));
  }

  const noiseInstruments: TNoiseInstrument[] = [];
  for (let i = 1; i <= 15; i++) {
    noiseInstruments.push(createDefaultNoiseInstrument(`Noise ${i}`));
  }

  const patterns: Record<number, TPattern> = {
    0: createEmptyPattern(),
    1: createEmptyPattern(),
    2: createEmptyPattern(),
    3: createEmptyPattern(),
  };

  const routines: string[] = [];
  for (let i = 0; i < 16; i++) routines.push('');

  return {
    version: 6,
    name: title,
    artist,
    comment: '',
    dutyInstruments,
    waveInstruments,
    noiseInstruments,
    waves: createDefaultWaves(),
    ticksPerRow: 4,
    timerEnabled: false,
    timerDivider: 255,
    patterns,
    orderMatrix: [[0], [1], [2], [3]],
    routines,
  };
}

export const createDefaultSong = createNewSong;
