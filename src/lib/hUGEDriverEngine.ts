import { TSong, TCell, NO_NOTE } from '../types/uge';
import { GameBoyApu } from './gameboyApu';

export const NOTE_TABLE: number[] = [
  44, 156, 262, 363, 457, 547, 631, 710, 786, 854, 923, 986,
  1046, 1102, 1155, 1205, 1253, 1297, 1339, 1379, 1417, 1452, 1486, 1517,
  1546, 1575, 1602, 1627, 1650, 1673, 1694, 1714, 1732, 1750, 1767, 1783,
  1798, 1812, 1825, 1837, 1849, 1860, 1871, 1881, 1890, 1899, 1907, 1915,
  1923, 1930, 1936, 1943, 1949, 1954, 1959, 1964, 1969, 1974, 1978, 1982,
  1985, 1988, 1992, 1995, 1998, 2001, 2004, 2006, 2009, 2011, 2013, 2015
];

export function getNotePoly(note: number): number {
  const inv = (255 - ((note + 192) & 0xff)) & 0xff; // 63 - note
  if (inv < 7) {
    return inv;
  }
  const b = ((inv >> 2) - 1) & 0x0f;
  const c = ((inv & 3) + 4) & 0x0f;
  return c | (b << 4);
}

export class HUGEDriverEngine {
  public apu: GameBoyApu;
  public song: TSong | null = null;

  // Playback state
  public isPlaying = false;
  public currentOrder = 0;
  public currentRow = 0;
  public currentTick = 0;
  public ticksPerRow = 4;
  public counter = 0;

  public activePlayingOrder = 0;
  public activePlayingRow = 0;

  private rowBreak: number | null = null;
  private nextOrder: number | null = null;
  private currentWave = -1;

  // Per-channel state
  private channelPeriod = [0, 0, 0, 0];
  private toneportaTarget = [0, 0, 0, 0];
  private channelNote = [0, 0, 0, 0];
  private highmask = [0x80, 0x80, 0x80, 0x80];
  private tablePtr: (TCell[] | null)[] = [null, null, null, null];
  private tableRow = [0, 0, 0, 0];
  private stepWidth4 = 0;

  constructor(apu: GameBoyApu) {
    this.apu = apu;
  }

  public setSong(song: TSong): void {
    this.song = song;
    this.ticksPerRow = song.ticksPerRow || 4;
  }

  public start(order = 0, row = 0): void {
    this.currentOrder = order;
    this.currentRow = row;
    this.activePlayingOrder = order;
    this.activePlayingRow = row;
    this.currentTick = 0;
    this.counter = 0;
    this.rowBreak = null;
    this.nextOrder = null;
    this.currentWave = -1;
    this.ticksPerRow = this.song?.ticksPerRow || 4;

    this.channelPeriod = [0, 0, 0, 0];
    this.toneportaTarget = [0, 0, 0, 0];
    this.channelNote = [0, 0, 0, 0];
    this.highmask = [0x80, 0x80, 0x80, 0x80];
    this.tablePtr = [null, null, null, null];
    this.tableRow = [0, 0, 0, 0];
    this.stepWidth4 = 0;

    this.apu.reset();
    this.isPlaying = true;

    // Load initial waves into Wave RAM if song has waves
    if (this.song && this.song.waves && this.song.waves[0]) {
      this.loadWaveform(0);
    }
  }

  public stop(): void {
    this.isPlaying = false;
    this.apu.reset();
  }

  public loadWaveform(waveIndex: number): void {
    if (!this.song || !this.song.waves[waveIndex]) return;
    const wave = this.song.waves[waveIndex];
    // Copy 32 4-bit samples into 16 bytes of Wave RAM ($FF30..$FF3F)
    for (let i = 0; i < 16; i++) {
      const highNibble = (wave[i * 2] || 0) & 0x0f;
      const lowNibble = (wave[i * 2 + 1] || 0) & 0x0f;
      this.apu.regs[0x20 + i] = (highNibble << 4) | lowNibble;
    }
    this.currentWave = waveIndex;
  }

  /**
   * Ticks the sound engine once (corresponds directly to `hUGE_dosound` in hUGEDriver.asm).
   */
  public tick(): void {
    if (!this.isPlaying || !this.song) return;

    if (this.currentTick === 0) {
      this.processRowNotes();
    } else {
      this.processEffects();
    }

    this.advanceTime();
  }

  /**
   * Corresponds to tick 0 note playback and instrument configuration in hUGE_dosound.
   */
  private processRowNotes(): void {
    if (!this.song) return;

    this.activePlayingOrder = this.currentOrder;
    this.activePlayingRow = this.currentRow;

    for (let ch = 0; ch < 4; ch++) {
      const patIdx = this.song.orderMatrix[ch]?.[this.currentOrder] ?? 0;
      const pattern = this.song.patterns[patIdx];
      const cell: TCell = pattern?.[this.currentRow] || {
        note: NO_NOTE,
        instrument: 0,
        volume: 0,
        effectCode: 0,
        effectParams: 0,
      };

      const hasValidNote = cell.note < 72 && cell.note !== NO_NOTE;
      let willPlayNote = hasValidNote;

      if (hasValidNote) {
        this.channelNote[ch] = cell.note;
        if (cell.effectCode === 3) {
          // Tone portamento: setup target period without retriggering note
          this.toneportaTarget[ch] = ch === 3 ? getNotePoly(cell.note) : (NOTE_TABLE[cell.note] ?? 0);
          willPlayNote = false;
        } else {
          if (ch === 3) {
            this.channelPeriod[ch] = getNotePoly(cell.note) | this.stepWidth4;
          } else {
            this.channelPeriod[ch] = NOTE_TABLE[cell.note] ?? 0;
          }
        }
      }

      // Setup instrument if specified
      if (cell.instrument > 0) {
        const instIdx = cell.instrument - 1;
        this.highmask[ch] &= 0x7f; // Reset initial flag

        if (ch === 0) {
          const inst = this.song.dutyInstruments[instIdx];
          if (inst) {
            const sweep = (inst.sweepTime << 4) | (inst.sweepIncDec << 3) | (inst.sweepShift & 7);
            const len = (inst.duty << 6) | (inst.length & 0x3f);
            const volDir = inst.volSweepDirection === 0 ? 1 : 0;
            const env = (inst.initialVolume << 4) | (volDir << 3) | (inst.volSweepAmount & 7);

            this.apu.write(0xff10, sweep);
            this.apu.write(0xff11, len);
            this.apu.write(0xff12, env);

            this.tablePtr[0] = inst.subpatternEnabled && inst.subpattern ? inst.subpattern : null;
            this.tableRow[0] = 0;
            this.highmask[0] = (inst.lengthEnabled ? 0x40 : 0) | 0x80;
          }
        } else if (ch === 1) {
          const inst = this.song.dutyInstruments[instIdx];
          if (inst) {
            const len = (inst.duty << 6) | (inst.length & 0x3f);
            const volDir = inst.volSweepDirection === 0 ? 1 : 0;
            const env = (inst.initialVolume << 4) | (volDir << 3) | (inst.volSweepAmount & 7);

            this.apu.write(0xff16, len);
            this.apu.write(0xff17, env);

            this.tablePtr[1] = inst.subpatternEnabled && inst.subpattern ? inst.subpattern : null;
            this.tableRow[1] = 0;
            this.highmask[1] = (inst.lengthEnabled ? 0x40 : 0) | 0x80;
          }
        } else if (ch === 2) {
          const inst = this.song.waveInstruments[instIdx];
          if (inst) {
            this.apu.write(0xff1b, inst.length & 0xff);
            this.apu.write(0xff1c, (inst.outputLevel & 3) << 5);

            if (this.currentWave !== inst.waveform) {
              this.loadWaveform(inst.waveform);
            }

            this.tablePtr[2] = inst.subpatternEnabled && inst.subpattern ? inst.subpattern : null;
            this.tableRow[2] = 0;
            this.highmask[2] = (inst.lengthEnabled ? 0x40 : 0) | 0x80;
          }
        } else if (ch === 3) {
          const inst = this.song.noiseInstruments[instIdx];
          if (inst) {
            const volDir = inst.volSweepDirection === 0 ? 1 : 0;
            const env = (inst.initialVolume << 4) | (volDir << 3) | (inst.volSweepAmount & 7);
            this.apu.write(0xff21, env);
            this.apu.write(0xff20, inst.length & 0x3f);

            this.tablePtr[3] = inst.subpatternEnabled && inst.subpattern ? inst.subpattern : null;
            this.tableRow[3] = 0;
            this.stepWidth4 = inst.counterStep ? 0x08 : 0x00;
            this.channelPeriod[3] |= this.stepWidth4;
            this.highmask[3] = (inst.lengthEnabled ? 0x40 : 0) | 0x80;
          }
        }
      }

      // Check note delay effect (7xx) or tick 0 note cut (E00): if present, suppress immediate note playback
      if (cell.effectCode === 7 || (cell.effectCode === 0xe && cell.effectParams === 0)) {
        willPlayNote = false;
      }

      // Execute effects on tick 0
      this.doEffect(ch, cell.effectCode, cell.effectParams, true);

      // Play note on hardware APU
      if (willPlayNote) {
        this.playChannelNote(ch);
      }

      // Process subpattern macro on tick 0
      if (this.tablePtr[ch]) {
        this.doTable(ch);
      }
    }
  }

  /**
   * Corresponds to `process_effects` in hUGEDriver.asm for tick > 0.
   */
  private processEffects(): void {
    if (!this.song) return;

    for (let ch = 0; ch < 4; ch++) {
      const patIdx = this.song.orderMatrix[ch]?.[this.currentOrder] ?? 0;
      const cell: TCell = this.song.patterns[patIdx]?.[this.currentRow] || {
        note: NO_NOTE,
        instrument: 0,
        volume: 0,
        effectCode: 0,
        effectParams: 0,
      };

      if (cell.effectCode !== 0 || cell.effectParams !== 0) {
        this.doEffect(ch, cell.effectCode, cell.effectParams, false);
      }

      // Process subpattern macro on tick > 0
      if (this.tablePtr[ch]) {
        this.doTable(ch);
      }
    }
  }

  /**
   * Executes an effect command according to hUGEDriver.asm.
   */
  private doEffect(ch: number, code: number, param: number, isTick0: boolean, fromSubpattern = false): void {
    switch (code) {
      // 0xy: Arpeggio (tick > 0 or subpattern)
      case 0x0: {
        if ((isTick0 && !fromSubpattern) || param === 0) return;
        const arpStep = this.currentTick % 3;
        let noteOffset = 0;
        if (arpStep === 1) {
          noteOffset = param & 0x0f; // LOW nibble first (arp1 in hUGEDriver.asm)
        } else if (arpStep === 2) {
          noteOffset = (param >> 4) & 0x0f; // HIGH nibble second (arp2 in hUGEDriver.asm)
        }
        const rootNote = this.channelNote[ch];
        const targetNote = Math.min(71, rootNote + noteOffset);
        if (ch === 3) {
          this.channelPeriod[ch] = getNotePoly(targetNote) | this.stepWidth4;
        } else {
          this.channelPeriod[ch] = NOTE_TABLE[targetNote] ?? 0;
        }
        this.updateChannelFreq(ch);
        break;
      }

      // 1xx: Portamento Up (tick > 0 or subpattern)
      case 0x1: {
        if (isTick0 && !fromSubpattern) return;
        this.channelPeriod[ch] = Math.min(2047, this.channelPeriod[ch] + param);
        this.updateChannelFreq(ch);
        break;
      }

      // 2xx: Portamento Down (tick > 0 or subpattern)
      case 0x2: {
        if (isTick0 && !fromSubpattern) return;
        this.channelPeriod[ch] = Math.max(0, this.channelPeriod[ch] - param);
        this.updateChannelFreq(ch);
        break;
      }

      // 3xx: Tone Portamento
      case 0x3: {
        if (isTick0 && !fromSubpattern) return;
        const target = this.toneportaTarget[ch];
        if (this.channelPeriod[ch] < target) {
          this.channelPeriod[ch] = Math.min(target, this.channelPeriod[ch] + param);
        } else if (this.channelPeriod[ch] > target) {
          this.channelPeriod[ch] = Math.max(target, this.channelPeriod[ch] - param);
        }
        this.updateChannelFreq(ch);
        break;
      }

      // 4xy: Vibrato (tick > 0 or subpattern)
      case 0x4: {
        if (isTick0 && !fromSubpattern) return;
        const speed = (param >> 4) & 0x0f;
        const depth = param & 0x0f;
        const basePeriod = (ch === 3 ? (getNotePoly(this.channelNote[ch]) | this.stepWidth4) : NOTE_TABLE[this.channelNote[ch]]) ?? this.channelPeriod[ch];
        if ((this.counter & speed) === 0) {
          this.channelPeriod[ch] = Math.min(2047, basePeriod + depth);
        } else {
          this.channelPeriod[ch] = basePeriod;
        }
        this.updateChannelFreq(ch);
        break;
      }

      // 5xx: Master Volume (tick 0)
      case 0x5: {
        if (!isTick0) return;
        this.apu.write(0xff24, param);
        break;
      }

      // 7xx: Note Delay
      case 0x7: {
        if (!isTick0 && this.currentTick === param) {
          this.playChannelNote(ch);
        }
        break;
      }

      // 8xx: Set Pan (NR51) (tick 0)
      case 0x8: {
        if (!isTick0) return;
        this.apu.write(0xff25, param);
        break;
      }

      // 9xx: Set Duty / Timbre (tick 0 or subpattern)
      case 0x9: {
        if (!isTick0 && !fromSubpattern) return;
        const dutyVal = (param & 0xc0) !== 0 ? param : (param & 3) << 6;
        if (ch === 0) this.apu.write(0xff11, dutyVal);
        else if (ch === 1) this.apu.write(0xff16, dutyVal);
        else if (ch === 2) {
          this.loadWaveform(param & 0x0f);
          this.playChannelNote(2);
        } else if (ch === 3) {
          this.stepWidth4 = param & 0x08;
          this.channelPeriod[3] = (this.channelPeriod[3] & ~0x08) | this.stepWidth4;
          this.apu.write(0xff22, this.channelPeriod[3]);
        }
        break;
      }

      // Axy: Volume Slide (tick 0 or subpattern)
      case 0xa: {
        if (!isTick0 && !fromSubpattern) return;
        const up = (param >> 4) & 0x0f;
        const down = param & 0x0f;
        let vol = this.apu.snd[ch].vol;
        vol = Math.max(0, Math.min(15, vol + up - down));
        this.apu.snd[ch].vol = vol;
        const regAddr = ch === 0 ? 0xff12 : ch === 1 ? 0xff17 : ch === 3 ? 0xff21 : 0;
        if (regAddr) {
          this.apu.write(regAddr, (vol << 4));
          this.playChannelNote(ch);
        }
        break;
      }

      // Bxx: Position Jump (tick 0)
      case 0xb: {
        if (!isTick0) return;
        const orderCount = this.song
          ? Math.max(
              this.song.orderMatrix[0]?.length || 1,
              this.song.orderMatrix[1]?.length || 1,
              this.song.orderMatrix[2]?.length || 1,
              this.song.orderMatrix[3]?.length || 1
            )
          : 1;
        // B00 jumps to the next order; B01 jumps to 1st order (idx 0); B02 jumps to 2nd order (idx 1), etc.
        this.nextOrder = param > 0 ? (param - 1) % orderCount : (this.currentOrder + 1) % orderCount;
        if (this.rowBreak === null) {
          this.rowBreak = 0;
        }
        break;
      }

      // Cxx: Set Volume and Envelope (tick 0 or subpattern)
      case 0xc: {
        if (!isTick0 && !fromSubpattern) return;
        const vol = param & 0x0f;
        const envParam = (param >> 4) & 0x0f;

        let envBits: number;
        if (ch === 3) {
          // On CH4 (Noise), Cxx disables the envelope sweep (creates sustain/fixed volume) unless an envelope is specified
          envBits = envParam !== 0 && envParam !== 8 ? envParam : 0;
        } else if (envParam === 0) {
          // Keep existing instrument/channel envelope bits on pulse channels
          const currentEnv = ch === 0 ? this.apu.regs[0x02] : this.apu.regs[0x07];
          envBits = currentEnv & 0x0f;
        } else if (envParam === 8) {
          // Envelope off (step 0)
          envBits = 0;
        } else {
          // 1..7: sweep down (dir 0, step envParam) -> bits = envParam
          // 9..15: sweep up (dir 1, step envParam - 8) -> bits = envParam
          envBits = envParam;
        }

        if (ch === 0) {
          this.apu.write(0xff12, (vol << 4) | envBits);
          this.playChannelNote(0);
          this.apu.snd[0].vol = vol;
          this.apu.snd[0].enable = vol > 0 || envBits > 0;
        } else if (ch === 1) {
          this.apu.write(0xff17, (vol << 4) | envBits);
          this.playChannelNote(1);
          this.apu.snd[1].vol = vol;
          this.apu.snd[1].enable = vol > 0 || envBits > 0;
        } else if (ch === 2) {
          const level = vol >= 10 ? 1 : vol >= 5 ? 2 : vol > 0 ? 3 : 0;
          this.apu.write(0xff1c, level << 5);
        } else if (ch === 3) {
          this.apu.write(0xff21, (vol << 4) | envBits);
          this.playChannelNote(3);
          this.apu.snd[3].vol = vol;
          this.apu.snd[3].enable = vol > 0 || envBits > 0;
        }
        break;
      }

      // Dxx: Pattern Break (tick 0)
      case 0xd: {
        if (!isTick0) return;
        // Dxx jumps to target - 1 (1 row before) with wrap-around / clamping guards
        this.rowBreak = param > 0 ? Math.min(63, (param - 1) % 64) : 0;
        break;
      }

      // Exx: Note Cut
      case 0xe: {
        if (this.currentTick === param) {
          if (ch === 0) {
            this.apu.write(0xff12, 0x00);
            this.apu.write(0xff14, 0x80);
            this.apu.snd[0].vol = 0;
            this.apu.snd[0].enable = false;
          } else if (ch === 1) {
            this.apu.write(0xff17, 0x00);
            this.apu.write(0xff19, 0x80);
            this.apu.snd[1].vol = 0;
            this.apu.snd[1].enable = false;
          } else if (ch === 2) {
            this.apu.write(0xff1c, 0x00);
            this.apu.snd[2].enable = false;
          } else if (ch === 3) {
            this.apu.write(0xff21, 0x00);
            this.apu.write(0xff23, 0x80);
            this.apu.snd[3].vol = 0;
            this.apu.snd[3].enable = false;
          }
        }
        break;
      }

      // Fxx: Set Speed / Tempo (tick 0)
      case 0xf: {
        if (!isTick0) return;
        if (param > 0) {
          this.ticksPerRow = param;
        }
        break;
      }
    }
  }

  /**
   * Executes subpattern macro row (`do_table` in hUGEDriver.asm).
   * Advances row-by-row through the subpattern (32 rows) unless an explicit jump occurs.
   * In hUGETracker and hUGEDriver.asm, subpatterns strictly loop every 32 rows.
   */
  private doTable(ch: number): void {
    const table = this.tablePtr[ch];
    if (!table || table.length === 0) return;

    const maxLen = Math.min(32, table.length);

    let rowIdx = this.tableRow[ch];
    if (rowIdx >= maxLen) {
      rowIdx = 0;
    }

    const cell = table[rowIdx];
    if (!cell) return;

    // Advance to next row or jump target (loops at 32-row boundary or explicit jump)
    if (cell.volume && cell.volume > 0) {
      // cell.volume is the 0-based target row in UGE subpatterns (e.g. J03 -> row 3)
      this.tableRow[ch] = Math.max(0, Math.min(maxLen - 1, cell.volume));
    } else {
      this.tableRow[ch] = (rowIdx + 1) % maxLen;
    }

    // Apply note offset (subpatterns use 36 as base 0-transpose)
    if (cell.note !== NO_NOTE && cell.note !== undefined) {
      const offset = cell.note - 36;
      const newNote = Math.max(0, Math.min(71, this.channelNote[ch] + offset));
      if (ch === 3) {
        this.channelPeriod[ch] = getNotePoly(newNote) | this.stepWidth4;
      } else {
        this.channelPeriod[ch] = NOTE_TABLE[newNote] ?? 0;
      }
      this.updateChannelFreq(ch);
    }

    // Apply subpattern effect
    if (cell.effectCode || cell.effectParams) {
      this.doEffect(ch, cell.effectCode, cell.effectParams, false, true);
    }
  }

  private updateChannelFreq(ch: number): void {
    const period = this.channelPeriod[ch];
    if (ch === 0) {
      this.apu.write(0xff13, period & 0xff);
      this.apu.write(0xff14, (period >> 8) & 0x07);
    } else if (ch === 1) {
      this.apu.write(0xff18, period & 0xff);
      this.apu.write(0xff19, (period >> 8) & 0x07);
    } else if (ch === 2) {
      this.apu.write(0xff1d, period & 0xff);
      this.apu.write(0xff1e, (period >> 8) & 0x07);
    } else if (ch === 3) {
      this.apu.write(0xff22, period & 0xff);
    }
  }

  private playChannelNote(ch: number): void {
    const period = this.channelPeriod[ch];
    const mask = this.highmask[ch];

    if (ch === 0) {
      this.apu.write(0xff13, period & 0xff);
      this.apu.write(0xff14, ((period >> 8) & 0x07) | mask);
    } else if (ch === 1) {
      this.apu.write(0xff18, period & 0xff);
      this.apu.write(0xff19, ((period >> 8) & 0x07) | mask);
    } else if (ch === 2) {
      // Re-enable wave channel safely
      this.apu.write(0xff1a, 0x00);
      this.apu.write(0xff1a, 0x80);
      this.apu.write(0xff1d, period & 0xff);
      this.apu.write(0xff1e, ((period >> 8) & 0x07) | mask);
    } else if (ch === 3) {
      this.apu.write(0xff22, period & 0xff);
      this.apu.write(0xff23, mask);
    }
  }

  /**
   * Corresponds directly to `tick_time` in hUGEDriver.asm.
   */
  private advanceTime(): void {
    if (!this.song) return;

    this.counter++;
    this.currentTick++;

    if (this.currentTick >= this.ticksPerRow) {
      this.currentTick = 0;

      const orderCount = Math.max(
        this.song.orderMatrix[0]?.length || 1,
        this.song.orderMatrix[1]?.length || 1,
        this.song.orderMatrix[2]?.length || 1,
        this.song.orderMatrix[3]?.length || 1
      );

      // Check row break or position jump
      if (this.rowBreak !== null || this.nextOrder !== null) {
        this.currentRow = this.rowBreak !== null ? Math.min(63, Math.max(0, this.rowBreak)) : 0;
        this.rowBreak = null;
        if (this.nextOrder !== null) {
          this.currentOrder = this.nextOrder % orderCount;
          this.nextOrder = null;
        } else {
          this.currentOrder = (this.currentOrder + 1) % orderCount;
        }
      } else {
        this.currentRow++;
        if (this.currentRow >= 64) {
          this.currentRow = 0;
          this.currentOrder = (this.currentOrder + 1) % orderCount;
        }
      }
    }
  }
}
