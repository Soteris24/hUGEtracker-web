import { TSong, NO_NOTE, TInstrument } from '../types/uge';

export class BinaryWriter {
  private buffer: Uint8Array;
  private view: DataView;
  public offset: number;

  constructor(initialSize = 1024 * 1024) {
    this.buffer = new Uint8Array(initialSize);
    this.view = new DataView(this.buffer.buffer);
    this.offset = 0;
  }

  private ensureCapacity(needed: number): void {
    if (this.offset + needed <= this.buffer.byteLength) return;
    let newCap = this.buffer.byteLength * 2;
    while (newCap < this.offset + needed) {
      newCap *= 2;
    }
    const nextBuf = new Uint8Array(newCap);
    nextBuf.set(this.buffer);
    this.buffer = nextBuf;
    this.view = new DataView(this.buffer.buffer);
  }

  writeUint8(val: number): void {
    this.ensureCapacity(1);
    this.view.setUint8(this.offset, val & 0xff);
    this.offset += 1;
  }

  writeInt8(val: number): void {
    this.ensureCapacity(1);
    this.view.setInt8(this.offset, val);
    this.offset += 1;
  }

  writeUint32(val: number): void {
    this.ensureCapacity(4);
    this.view.setUint32(this.offset, val >>> 0, true);
    this.offset += 4;
  }

  writeInt32(val: number): void {
    this.ensureCapacity(4);
    this.view.setInt32(this.offset, val | 0, true);
    this.offset += 4;
  }

  writeBool(val: boolean): void {
    this.writeUint8(val ? 1 : 0);
  }

  writeShortString(str: string): void {
    this.ensureCapacity(256);
    const cleanStr = str.slice(0, 255);
    this.writeUint8(cleanStr.length);
    for (let i = 0; i < cleanStr.length; i++) {
      this.view.setUint8(this.offset, cleanStr.charCodeAt(i) & 0xff);
      this.offset += 1;
    }
    const padding = 255 - cleanStr.length;
    for (let i = 0; i < padding; i++) {
      this.view.setUint8(this.offset, 0);
      this.offset += 1;
    }
  }

  writeDynamicString(str: string): void {
    this.writeUint32(str.length);
    if (str.length > 0) {
      this.ensureCapacity(str.length);
      for (let i = 0; i < str.length; i++) {
        this.view.setUint8(this.offset, str.charCodeAt(i) & 0xff);
        this.offset += 1;
      }
    }
  }

  toBytes(): Uint8Array {
    return this.buffer.slice(0, this.offset);
  }
}

export function serializeUgeSong(song: TSong): Uint8Array {
  const w = new BinaryWriter(256 * 1024);

  // Version 6
  w.writeUint32(6);

  // Metadata
  w.writeShortString(song.name || '');
  w.writeShortString(song.artist || '');
  w.writeShortString(song.comment || '');

  // 45 Instruments: 15 Duty, 15 Wave, 15 Noise
  const allInstruments: TInstrument[] = [
    ...song.dutyInstruments.slice(0, 15),
    ...song.waveInstruments.slice(0, 15),
    ...song.noiseInstruments.slice(0, 15),
  ];

  for (let i = 0; i < 45; i++) {
    const inst = allInstruments[i];
    const type = i < 15 ? 0 : (i < 30 ? 1 : 2);
    w.writeUint32(type);
    w.writeShortString(inst ? inst.name : '');
    w.writeUint32(inst ? inst.length : 0);
    w.writeBool(inst ? inst.lengthEnabled : false);

    if (type === 0) {
      const d = inst as any;
      w.writeUint8(d?.initialVolume ?? 15);
      w.writeUint32(d?.volSweepDirection ?? 1);
      w.writeUint8(d?.volSweepAmount ?? 0);
      w.writeUint32(d?.sweepTime ?? 0);
      w.writeUint32(d?.sweepIncDec ?? 0);
      w.writeUint32(d?.sweepShift ?? 0);
      w.writeUint8(d?.duty ?? 2);
      w.writeUint32(0); // outputLevel
      w.writeUint32(0); // waveform
      w.writeUint32(0); // counterStep
    } else if (type === 1) {
      const wv = inst as any;
      w.writeUint8(0); // initialVolume
      w.writeUint32(0); // volSweepDirection
      w.writeUint8(0); // volSweepAmount
      w.writeUint32(0); // sweepTime
      w.writeUint32(0); // sweepIncDec
      w.writeUint32(0); // sweepShift
      w.writeUint8(0); // duty
      w.writeUint32(wv?.outputLevel ?? 1);
      w.writeUint32(wv?.waveform ?? (i - 15));
      w.writeUint32(0); // counterStep
    } else {
      const n = inst as any;
      w.writeUint8(n?.initialVolume ?? 15);
      w.writeUint32(n?.volSweepDirection ?? 1);
      w.writeUint8(n?.volSweepAmount ?? 3);
      w.writeUint32(0); // sweepTime
      w.writeUint32(0); // sweepIncDec
      w.writeUint32(0); // sweepShift
      w.writeUint8(0); // duty
      w.writeUint32(0); // outputLevel
      w.writeUint32(0); // waveform
      w.writeUint32(n?.counterStep ?? 0);
    }

    w.writeBool(inst ? inst.subpatternEnabled : false);

    const sub = inst && inst.subpattern ? inst.subpattern : [];
    for (let r = 0; r < 64; r++) {
      const cell = sub[r];
      w.writeUint32(cell ? cell.note : NO_NOTE);
      w.writeUint32(cell ? cell.instrument : 0);
      w.writeUint32(cell ? cell.volume : 0); // jump command value
      w.writeUint32(cell ? cell.effectCode : 0);
      w.writeUint8(cell ? cell.effectParams : 0);
    }
  }

  // 16 Waveforms
  for (let wi = 0; wi < 16; wi++) {
    const wave = song.waves[wi] || [];
    for (let s = 0; s < 32; s++) {
      w.writeUint8((wave[s] ?? 0) & 0x0f);
    }
  }

  // Song parameters
  w.writeUint32(song.ticksPerRow || 4);
  w.writeBool(song.timerEnabled || false);
  w.writeUint32(song.timerDivider || 255);

  const patternKeys = Object.keys(song.patterns).map(Number).sort((a, b) => a - b);
  w.writeUint32(patternKeys.length);

  for (const patKey of patternKeys) {
    w.writeUint32(patKey);
    const pat = song.patterns[patKey] || [];
    for (let r = 0; r < 64; r++) {
      const cell = pat[r];
      w.writeUint32(cell ? cell.note : NO_NOTE);
      w.writeUint32(cell ? cell.instrument : 0);
      w.writeUint32(cell ? cell.volume : 0);
      w.writeUint32(cell ? cell.effectCode : 0);
      w.writeUint8(cell ? cell.effectParams : 0);
    }
  }

  // OrderMatrix
  for (let ch = 0; ch < 4; ch++) {
    const orders = song.orderMatrix[ch] || [0];
    w.writeUint32(orders.length + 1); // length + 1 (Pascal off-by-one convention)
    for (const ord of orders) {
      w.writeUint32(ord);
    }
    w.writeUint32(0); // off-by-one bug filler
  }

  // 16 Routines
  for (let i = 0; i < 16; i++) {
    w.writeDynamicString(song.routines?.[i] || '');
  }

  return w.toBytes();
}
