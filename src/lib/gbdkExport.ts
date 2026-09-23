import {
  TSong,
  NOTE_C_NAMES,
  NO_NOTE,
  TCell,
  TDutyInstrument,
  TWaveInstrument,
  TNoiseInstrument,
} from '../types/uge';

function sanitizeIdentifier(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^([0-9])/, '_$1');
  return clean.length > 0 ? clean : 'song';
}

function effectCodeToStr(code: number, params: number): string {
  const c = (code & 0x0f).toString(16).toUpperCase();
  const p = (params & 0xff).toString(16).toUpperCase().padStart(2, '0');
  return c + p;
}

function renderGBDKCell(cell: TCell): string {
  const noteStr = cell.note === NO_NOTE || cell.note < 0 || cell.note >= NOTE_C_NAMES.length
    ? '___'
    : NOTE_C_NAMES[cell.note];
  const instStr = (cell.instrument >= 0 && cell.instrument <= 15) ? cell.instrument.toString() : '0';
  const effStr = '0x' + effectCodeToStr(cell.effectCode, cell.effectParams);
  return `${noteStr}, ${instStr}, ${effStr}`;
}

function renderGBDKSubpatternCell(cell: TCell, last: boolean): string {
  const noteStr = cell.note === NO_NOTE ? '___' : cell.note.toString();
  let jumpStr = cell.volume.toString();
  if (last && cell.volume === 0) {
    jumpStr = '1'; // auto loop back to 1
  }
  const effStr = '0x' + effectCodeToStr(cell.effectCode, cell.effectParams);
  return `${noteStr}, ${jumpStr}, ${effStr}`;
}

export function generateGbdkC(song: TSong, descriptorName = 'song', bank = -1): { cCode: string; hCode: string } {
  const identifier = sanitizeIdentifier(descriptorName || song.name || 'song');
  const lines: string[] = [];

  if (bank !== -1) {
    lines.push(`#pragma bank ${bank}`);
    lines.push('');
  }

  lines.push('#include "hUGEDriver.h"');
  lines.push('#include <stddef.h>');
  lines.push('');

  // Find used patterns and highest instrument numbers
  const usedPatterns = new Set<number>();
  let highestDutyInst = 0;
  let highestWaveInst = 0;
  let highestNoiseInst = 0;
  let highestWaveform = 0;

  for (let ch = 0; ch < 4; ch++) {
    const orders = song.orderMatrix[ch] || [];
    for (const patIdx of orders) {
      usedPatterns.add(patIdx);
      const pat = song.patterns[patIdx] || [];
      for (const cell of pat) {
        if (ch === 2 && cell.effectCode === 0x9) {
          if (cell.effectParams > highestWaveform) highestWaveform = Math.min(15, cell.effectParams);
        }
        if (cell.instrument > 0 && cell.instrument <= 15) {
          if (ch === 0 || ch === 1) {
            if (cell.instrument > highestDutyInst) highestDutyInst = cell.instrument;
          } else if (ch === 2) {
            if (cell.instrument > highestWaveInst) highestWaveInst = cell.instrument;
          } else if (ch === 3) {
            if (cell.instrument > highestNoiseInst) highestNoiseInst = cell.instrument;
          }
        }
      }
    }
  }

  // Fallbacks if nothing played
  highestDutyInst = Math.max(1, highestDutyInst);
  highestWaveInst = Math.max(1, highestWaveInst);
  highestNoiseInst = Math.max(1, highestNoiseInst);
  highestWaveform = Math.max(3, highestWaveform);

  const orderLengths = song.orderMatrix.map(o => o.length);
  const maxOrderLen = Math.max(...orderLengths, 1);
  lines.push(`static const unsigned char order_cnt = ${maxOrderLen * 2};`);
  lines.push('');

  // Render patterns
  const sortedPatternKeys = Array.from(usedPatterns).sort((a, b) => a - b);
  for (const pKey of sortedPatternKeys) {
    const pat = song.patterns[pKey] || [];
    lines.push(`static const unsigned char P${pKey}[] = {`);
    for (let r = 0; r < 64; r++) {
      const cell = pat[r] || { note: NO_NOTE, instrument: 0, volume: 0, effectCode: 0, effectParams: 0 };
      lines.push(`    DN(${renderGBDKCell(cell)}),`);
    }
    lines.push('};');
    lines.push('');
  }

  // Render subpatterns
  for (let i = 0; i < highestDutyInst; i++) {
    const inst = song.dutyInstruments[i];
    if (inst && inst.subpatternEnabled) {
      lines.push(`static const unsigned char dutySP${i + 1}[] = {`);
      for (let r = 0; r < 32; r++) {
        const cell = inst.subpattern[r] || { note: NO_NOTE, instrument: 0, volume: 0, effectCode: 0, effectParams: 0 };
        lines.push(`    DN(${renderGBDKSubpatternCell(cell, r === 31)}),`);
      }
      lines.push('};');
      lines.push('');
    }
  }

  for (let i = 0; i < highestWaveInst; i++) {
    const inst = song.waveInstruments[i];
    if (inst && inst.subpatternEnabled) {
      lines.push(`static const unsigned char waveSP${i + 1}[] = {`);
      for (let r = 0; r < 32; r++) {
        const cell = inst.subpattern[r] || { note: NO_NOTE, instrument: 0, volume: 0, effectCode: 0, effectParams: 0 };
        lines.push(`    DN(${renderGBDKSubpatternCell(cell, r === 31)}),`);
      }
      lines.push('};');
      lines.push('');
    }
  }

  for (let i = 0; i < highestNoiseInst; i++) {
    const inst = song.noiseInstruments[i];
    if (inst && inst.subpatternEnabled) {
      lines.push(`static const unsigned char noiseSP${i + 1}[] = {`);
      for (let r = 0; r < 32; r++) {
        const cell = inst.subpattern[r] || { note: NO_NOTE, instrument: 0, volume: 0, effectCode: 0, effectParams: 0 };
        lines.push(`    DN(${renderGBDKSubpatternCell(cell, r === 31)}),`);
      }
      lines.push('};');
      lines.push('');
    }
  }

  // Render order pointers
  for (let ch = 0; ch < 4; ch++) {
    const orders = song.orderMatrix[ch] || [0];
    const orderPats = orders.map(idx => `P${idx}`).join(', ');
    lines.push(`static const unsigned char* const order${ch + 1}[] = {${orderPats}};`);
  }
  lines.push('');

  // Render Duty Instruments
  lines.push('static const hUGEDutyInstr_t duty_instruments[] = {');
  for (let i = 0; i < highestDutyInst; i++) {
    const inst = song.dutyInstruments[i] || {} as TDutyInstrument;
    const sweep = ((inst.sweepShift ?? 0) & 0x07) | (((inst.sweepIncDec ?? 0) & 0x01) << 3) | (((inst.sweepTime ?? 0) & 0x07) << 4);
    const lenDuty = ((inst.length ?? 0) & 0x3f) | (((inst.duty ?? 2) & 0x03) << 6);
    const volDir = inst.volSweepDirection === 0 ? 1 : 0;
    const envelope = ((inst.volSweepAmount ?? 0) & 0x07) | (volDir << 3) | (((inst.initialVolume ?? 15) & 0x0f) << 4);
    const subpat = inst.subpatternEnabled ? `dutySP${i + 1}` : '0';
    const highmask = (inst.lengthEnabled ? 0x40 : 0x00) | 0x80;
    lines.push(`    {${sweep}, ${lenDuty}, ${envelope}, ${subpat}, ${highmask}},`);
  }
  lines.push('};');
  lines.push('');

  // Render Wave Instruments
  lines.push('static const hUGEWaveInstr_t wave_instruments[] = {');
  for (let i = 0; i < highestWaveInst; i++) {
    const inst = song.waveInstruments[i] || {} as TWaveInstrument;
    const length = (inst.length ?? 0) & 0xff;
    const volume = ((inst.outputLevel ?? 1) & 0x03) << 5;
    const waveform = (inst.waveform ?? i) & 0x0f;
    const subpat = inst.subpatternEnabled ? `waveSP${i + 1}` : '0';
    const highmask = (inst.lengthEnabled ? 0x40 : 0x00) | 0x80;
    lines.push(`    {${length}, ${volume}, ${waveform}, ${subpat}, ${highmask}},`);
  }
  lines.push('};');
  lines.push('');

  // Render Noise Instruments
  lines.push('static const hUGENoiseInstr_t noise_instruments[] = {');
  for (let i = 0; i < highestNoiseInst; i++) {
    const inst = song.noiseInstruments[i] || {} as TNoiseInstrument;
    const volDir = inst.volSweepDirection === 0 ? 1 : 0;
    const envelope = ((inst.volSweepAmount ?? 3) & 0x07) | (volDir << 3) | (((inst.initialVolume ?? 15) & 0x0f) << 4);
    const subpat = inst.subpatternEnabled ? `noiseSP${i + 1}` : '0';
    const len = (inst.length ?? 0) & 0x3f;
    const highmask = (inst.counterStep === 1 ? 0x80 : 0x00) | (inst.lengthEnabled ? 0x40 : 0x00) | len;
    lines.push(`    {${envelope}, ${subpat}, ${highmask}, 0, 0},`);
  }
  lines.push('};');
  lines.push('');

  // Render Waves
  lines.push('static const unsigned char waves[] = {');
  for (let w = 0; w <= highestWaveform; w++) {
    const wave = song.waves[w] || [];
    const packedBytes: number[] = [];
    for (let s = 0; s < 32; s += 2) {
      const highNibble = (wave[s] ?? 0) & 0x0f;
      const lowNibble = (wave[s + 1] ?? 0) & 0x0f;
      packedBytes.push((highNibble << 4) | lowNibble);
    }
    lines.push(`    ${packedBytes.map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ')},`);
  }
  lines.push('};');
  lines.push('');

  if (bank !== -1) {
    lines.push(`const void __at(${bank}) __bank_${identifier};`);
  }

  lines.push(`const hUGESong_t ${identifier} = {`);
  lines.push(`    ${song.ticksPerRow},`);
  lines.push('    &order_cnt,');
  lines.push('    order1, order2, order3, order4,');
  lines.push('    duty_instruments, wave_instruments, noise_instruments,');
  lines.push('    NULL,');
  lines.push('    waves');
  lines.push('};');

  const cCode = lines.join('\n');

  // Header file
  const guard = `${identifier.toUpperCase()}_H`;
  const hCode = [
    `#ifndef ${guard}`,
    `#define ${guard}`,
    '',
    '#include "hUGEDriver.h"',
    '',
    bank !== -1 ? `extern const void __bank_${identifier};` : '',
    `extern const hUGESong_t ${identifier};`,
    '',
    `#endif // ${guard}`,
    '',
  ].filter(Boolean).join('\n');

  return { cCode, hCode };
}
