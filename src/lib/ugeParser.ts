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

  const dutyInstruments: TDutyInstrument[] = Array.from({ length: 15 }, (_, i) =>
    createDefaultDutyInstrument(`Duty ${i + 1}`)
  );
  const waveInstruments: TWaveInstrument[] = Array.from({ length: 15 }, (_, i) =>
    createDefaultWaveInstrument(`Wave ${i + 1}`)
  );
  const noiseInstruments: TNoiseInstrument[] = Array.from({ length: 15 }, (_, i) =>
    createDefaultNoiseInstrument(`Noise ${i + 1}`)
  );

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

      if (i < 15) {
        dutyInstruments[i] = {
          type: 0,
          name: instName || `Duty ${i + 1}`,
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
        };
      } else if (i < 30) {
        const waveIdx = i - 15;
        waveInstruments[waveIdx] = {
          type: 1,
          name: instName || `Wave ${waveIdx + 1}`,
          length,
          lengthEnabled,
          outputLevel: Math.min(3, Math.max(0, outputLevel & 3)),
          waveform: Math.min(15, Math.max(0, waveform)),
          subpatternEnabled,
          subpattern,
        };
      } else {
        const noiseIdx = i - 30;
        noiseInstruments[noiseIdx] = {
          type: 2,
          name: instName || `Noise ${noiseIdx + 1}`,
          length,
          lengthEnabled,
          initialVolume,
          volSweepDirection,
          volSweepAmount,
          counterStep,
          noiseMacro: [0, 0, 0, 0, 0, 0],
          subpatternEnabled,
          subpattern,
        };
      }
    } else {
      // version 1..5
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

      if (version <= 2) {
        // In v1 and v2 songs, instruments 1..15 are stored in a single 15-entry bank.
        // In hUGETracker v1, wave output level was: 0=Mute, 1=25%, 2=50%, 3=100%.
        // Normalizing to modern hUGETracker index: 0=Mute, 1=100%, 2=50%, 3=25%.
        const normalizedOutputLevel =
          outputLevel === 3 ? 1 : outputLevel === 1 ? 3 : (outputLevel & 3);

        if (type === 0) {
          dutyInstruments[i] = {
            type: 0,
            name: instName || `Duty ${i + 1}`,
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
          };
        } else if (type === 1) {
          waveInstruments[i] = {
            type: 1,
            name: instName || `Wave ${i + 1}`,
            length,
            lengthEnabled,
            outputLevel: normalizedOutputLevel,
            waveform: Math.min(15, Math.max(0, waveform)),
            subpatternEnabled: false,
            subpattern: createEmptyPattern(),
          };
        } else {
          noiseInstruments[i] = {
            type: 2,
            name: instName || `Noise ${i + 1}`,
            length,
            lengthEnabled,
            initialVolume,
            volSweepDirection,
            volSweepAmount,
            counterStep,
            noiseMacro,
            subpatternEnabled: false,
            subpattern: createEmptyPattern(),
          };
        }
      } else {
        // version 3..5: 45 fixed instrument slots (0..14 Duty, 15..29 Wave, 30..44 Noise)
        if (i < 15) {
          dutyInstruments[i] = {
            type: 0,
            name: instName || `Duty ${i + 1}`,
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
          };
        } else if (i < 30) {
          const waveIdx = i - 15;
          waveInstruments[waveIdx] = {
            type: 1,
            name: instName || `Wave ${waveIdx + 1}`,
            length,
            lengthEnabled,
            outputLevel: Math.min(3, Math.max(0, outputLevel & 3)),
            waveform: Math.min(15, Math.max(0, waveform)),
            subpatternEnabled: false,
            subpattern: createEmptyPattern(),
          };
        } else {
          const noiseIdx = i - 30;
          noiseInstruments[noiseIdx] = {
            type: 2,
            name: instName || `Noise ${noiseIdx + 1}`,
            length,
            lengthEnabled,
            initialVolume,
            volSweepDirection,
            volSweepAmount,
            counterStep,
            noiseMacro,
            subpatternEnabled: false,
            subpattern: createEmptyPattern(),
          };
        }
      }
    }

    r.seek(instStart + instSize);
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
