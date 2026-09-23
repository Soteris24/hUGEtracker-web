import {
  TSong,
  TDutyInstrument,
  TWaveInstrument,
  TNoiseInstrument,
  TPattern,
  TCell,
  NO_NOTE,
  createDefaultDutyInstrument,
  createDefaultWaveInstrument,
  createDefaultNoiseInstrument,
  createEmptyPattern,
} from '../types/uge';

export class BinaryReader {
  private view: DataView;
  public offset: number;

  constructor(buffer: ArrayBuffer | Uint8Array) {
    if (buffer instanceof Uint8Array) {
      this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } else {
      this.view = new DataView(buffer);
    }
    this.offset = 0;
  }

  get length(): number {
    return this.view.byteLength;
  }

  get remaining(): number {
    return this.length - this.offset;
  }

  readUint8(): number {
    const val = this.view.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  readInt8(): number {
    const val = this.view.getInt8(this.offset);
    this.offset += 1;
    return val;
  }

  readUint32(): number {
    const val = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return val;
  }

  readInt32(): number {
    const val = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return val;
  }

  readBool(): boolean {
    return this.readUint8() !== 0;
  }

  readShortString(): string {
    const len = this.readUint8();
    let str = '';
    for (let i = 0; i < len; i++) {
      const code = this.view.getUint8(this.offset + i);
      str += String.fromCharCode(code);
    }
    this.offset += 255;
    return str;
  }

  readDynamicString(): string {
    if (this.remaining < 4) return '';
    const len = this.readUint32();
    if (len <= 0 || len > this.remaining) {
      return '';
    }
    let str = '';
    for (let i = 0; i < len; i++) {
      const code = this.view.getUint8(this.offset + i);
      if (code !== 0) {
        str += String.fromCharCode(code);
      }
    }
    this.offset += len;
    return str;
  }

  seek(newOffset: number): void {
    this.offset = newOffset;
  }

  skip(bytes: number): void {
    this.offset += bytes;
  }
}

export function parseUgeBuffer(data: ArrayBuffer | Uint8Array): TSong {
  const r = new BinaryReader(data);
  const version = r.readUint32();

  const name = r.readShortString();
  const artist = r.readShortString();
  const comment = r.readShortString();

  const dutyInstruments: TDutyInstrument[] = [];
  const waveInstruments: TWaveInstrument[] = [];
  const noiseInstruments: TNoiseInstrument[] = [];

  let instCount = 45;
  let instSize = 1385;
  if (version === 1 || version === 2) {
    instCount = 15;
    instSize = 304;
  } else if (version === 3) {
    instCount = 45;
    instSize = 304;
  } else if (version === 4 || version === 5) {
    instCount = 45;
    instSize = 310;
  } else if (version >= 6) {
    instCount = 45;
    instSize = 1385;
  }

  for (let i = 0; i < instCount; i++) {
    const instStart = r.offset;
    const type = r.readUint32();
    const instName = r.readShortString();
    const length = r.readUint32();
    const lengthEnabled = r.readBool();

    if (version >= 6) {
      const initialVolume = r.readUint8();
      const volSweepDirection = (r.readUint32() ? 1 : 0) as 0 | 1;
      const volSweepAmount = r.readUint8();
      const sweepTime = r.readUint32();
      const sweepIncDec = (r.readUint32() ? 1 : 0) as 0 | 1;
      const sweepShift = r.readUint32();
      const duty = r.readUint8();
      const outputLevel = r.readUint32();
      const waveform = r.readUint32();
      const counterStep = (r.readUint32() ? 1 : 0) as 0 | 1;
      const subpatternEnabled = r.readBool();
      const subpattern = readPatternCells(r, 64, true, false);

      if (type === 0) {
        dutyInstruments.push({
          type: 0,
          name: instName,
          length,
          lengthEnabled,
          initialVolume,
          volSweepDirection,
          volSweepAmount,
          sweepTime,
          sweepIncDec,
          sweepShift,
          duty: Math.min(3, Math.max(0, duty)),
          subpatternEnabled,
          subpattern,
        });
      } else if (type === 1) {
        waveInstruments.push({
          type: 1,
          name: instName,
          length,
          lengthEnabled,
          outputLevel: Math.min(3, Math.max(0, outputLevel)),
          waveform: Math.min(15, Math.max(0, waveform)),
          subpatternEnabled,
          subpattern,
        });
      } else {
        noiseInstruments.push({
          type: 2,
          name: instName,
          length,
          lengthEnabled,
          initialVolume,
          volSweepDirection,
          volSweepAmount,
          counterStep,
          noiseMacro: [0, 0, 0, 0, 0, 0],
          subpatternEnabled,
          subpattern,
        });
      }
    } else if (version >= 1 && version <= 5) {
      const initialVolume = r.readUint8();
      const volSweepDirection = (r.readUint32() ? 1 : 0) as 0 | 1;
      const volSweepAmount = r.readUint8();
      const sweepTime = r.readUint32();
      const sweepIncDec = (r.readUint32() ? 1 : 0) as 0 | 1;
      const sweepShift = r.readUint32();
      const duty = r.readUint8();
      const outputLevel = r.readUint32();
      const waveform = r.readUint32();
      r.skip(4); // skip unused ShiftClockFreq at offset 292
      const counterStep = (r.readUint32() ? 1 : 0) as 0 | 1;
      r.skip(4); // skip DividingRatio at offset 300
      const noiseMacro: number[] = [];
      if (version === 4 || version === 5) {
        for (let m = 0; m < 6; m++) noiseMacro.push(r.readInt8());
      }

      if (type === 0) {
        dutyInstruments.push({
          type: 0,
          name: instName || `Duty ${dutyInstruments.length + 1}`,
          length,
          lengthEnabled,
          initialVolume,
          volSweepDirection,
          volSweepAmount,
          sweepTime,
          sweepIncDec,
          sweepShift,
          duty: Math.min(3, Math.max(0, duty)),
          subpatternEnabled: false,
          subpattern: createEmptyPattern(),
        });
      } else if (type === 1) {
        waveInstruments.push({
          type: 1,
          name: instName || `Wave ${waveInstruments.length + 1}`,
          length,
          lengthEnabled,
          outputLevel: Math.min(3, Math.max(0, outputLevel || 1)),
          waveform: Math.min(15, Math.max(0, waveform)),
          subpatternEnabled: false,
          subpattern: createEmptyPattern(),
        });
      } else {
        noiseInstruments.push({
          type: 2,
          name: instName || `Noise ${noiseInstruments.length + 1}`,
          length,
          lengthEnabled,
          initialVolume,
          volSweepDirection,
          volSweepAmount,
          counterStep,
          noiseMacro,
          subpatternEnabled: false,
          subpattern: createEmptyPattern(),
        });
      }
    }

    r.seek(instStart + instSize);
  }

  while (dutyInstruments.length < 15) {
    dutyInstruments.push(createDefaultDutyInstrument(`Duty ${dutyInstruments.length + 1}`));
  }
  while (waveInstruments.length < 15) {
    waveInstruments.push(createDefaultWaveInstrument(`Wave ${waveInstruments.length + 1}`));
  }
  while (noiseInstruments.length < 15) {
    noiseInstruments.push(createDefaultNoiseInstrument(`Noise ${noiseInstruments.length + 1}`));
  }

  // Waves
  const waves: number[][] = [];
  const waveBytes = version < 3 ? 33 : 32;
  for (let w = 0; w < 16; w++) {
    const waveStart = r.offset;
    const samples: number[] = [];
    for (let s = 0; s < 32; s++) {
      samples.push(r.readUint8() & 0x0f);
    }
    waves.push(samples);
    r.seek(waveStart + waveBytes);
  }

  // Song parameters
  const ticksPerRow = Math.max(1, Math.min(32, r.readUint32()));
  let timerEnabled = false;
  let timerDivider = 255;
  if (version >= 6) {
    timerEnabled = r.readBool();
    timerDivider = r.readUint32();
  }

  // Patterns
  const patCount = r.readUint32();
  const patterns: Record<number, TPattern> = {};
  for (let p = 0; p < patCount; p++) {
    let patKey = p;
    if (version >= 5) {
      patKey = r.readUint32();
    }
    const cells = readPatternCells(r, 64, false, version >= 6);
    patterns[patKey] = cells;
  }

  // OrderMatrix
  const orderMatrix: [number[], number[], number[], number[]] = [[], [], [], []];
  for (let ch = 0; ch < 4; ch++) {
    const rawLen = r.readUint32();
    const orders: number[] = [];
    for (let j = 0; j < rawLen; j++) {
      orders.push(r.readUint32());
    }
    if (orders.length > 1) {
      orders.pop();
    }
    orderMatrix[ch] = orders.length > 0 ? orders : [0];
  }

  // Routines (16 strings)
  const routines: string[] = [];
  for (let i = 0; i < 16; i++) {
    routines.push(r.readDynamicString());
  }

  return {
    version: 6,
    name: name.trim() || 'Untitled',
    artist: artist.trim() || 'Unknown Artist',
    comment: comment.trim(),
    dutyInstruments,
    waveInstruments,
    noiseInstruments,
    waves,
    ticksPerRow,
    timerEnabled,
    timerDivider,
    patterns,
    orderMatrix,
    routines,
  };
}

function readPatternCells(
  r: BinaryReader,
  count: number,
  isSubpattern: boolean,
  hasVolumeField: boolean
): TPattern {
  const cells: TCell[] = [];
  for (let i = 0; i < count; i++) {
    const note = r.readUint32();
    let instrument = 0;
    let volume = 0;

    if (isSubpattern) {
      instrument = r.readUint32(); // read instrument / unused field
      volume = r.readUint32(); // jump command value
    } else {
      instrument = r.readUint32();
      if (hasVolumeField) {
        volume = r.readUint32();
      }
    }

    const effectCode = r.readUint32() & 0x0f;
    const effectParams = r.readUint8();

    cells.push({
      note: note === 90 || note > 71 ? NO_NOTE : note,
      instrument: Math.min(15, Math.max(0, instrument)),
      volume,
      effectCode,
      effectParams,
    });
  }
  return cells;
}
