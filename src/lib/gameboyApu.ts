/**
 * Game Boy APU (Audio Processing Unit) Emulator
 * Faithfully translated from hUGETracker's sound.pas (Christian Hackbart / Rusty Wagner / SameBoy LFSR).
 */

const BIT_DUTY: number[][] = [
  [1, 0, 0, 0, 0, 0, 0, 0], // 12.5%
  [1, 1, 0, 0, 0, 0, 0, 0], // 25.0%
  [1, 1, 1, 1, 0, 0, 0, 0], // 50.0%
  [1, 1, 1, 1, 1, 1, 0, 0], // 75.0%
];

const VOL_TABLE: number[] = [
  0, 8, 17, 25, 34, 42, 51, 59, 68, 76, 85, 93, 102, 110, 119, 127,
];

export interface ChannelSoundState {
  enable: boolean;
  channelOff: boolean; // Mute flag
  vol: number; // 0..15
  len: number; // Length counter
  cnt: number; // Frequency phase accumulator
  freq: number; // 11-bit frequency or noise period
  bit: number; // Output bit
  swpCnt: number;
  envCnt: number;
}

export class GameBoyApu {
  // Memory-mapped I/O registers ($FF10 - $FF3F)
  public regs = new Uint8Array(0x40); // Index offset: addr - 0xFF10
  // Wave RAM is $FF30..$FF3F (indices 0x20..0x2F in regs)

  public snd: ChannelSoundState[] = [
    { enable: false, channelOff: false, vol: 0, len: 0, cnt: 0, freq: 0, bit: 0, swpCnt: 0, envCnt: 0 }, // CH1
    { enable: false, channelOff: false, vol: 0, len: 0, cnt: 0, freq: 0, bit: 0, swpCnt: 0, envCnt: 0 }, // CH2
    { enable: false, channelOff: false, vol: 0, len: 0, cnt: 0, freq: 0, bit: 0, swpCnt: 0, envCnt: 0 }, // CH3
    { enable: false, channelOff: false, vol: 0, len: 0, cnt: 0, freq: 0, bit: 0, swpCnt: 0, envCnt: 0 }, // CH4
  ];

  public lfsr = 0x7fff;
  private swpClk = 0;
  private envClk = 0;
  private lenClk = 0;
  private freqClk = 0;
  private freq4Clk = 0;

  // ── Real Oscilloscope Ring Buffers ──────────────────────────────────────────
  // Each channel captures actual synthesized sample output at the audio sample rate.
  // The canvas reads a snapshot of these buffers every animation frame.
  public static readonly OSC_BUF_SIZE = 2048;
  public oscBuf: Float32Array[] = [
    new Float32Array(GameBoyApu.OSC_BUF_SIZE),
    new Float32Array(GameBoyApu.OSC_BUF_SIZE),
    new Float32Array(GameBoyApu.OSC_BUF_SIZE),
    new Float32Array(GameBoyApu.OSC_BUF_SIZE),
  ];
  public oscWritePos = 0; // shared write head (all channels advance together)
  // ─────────────────────────────────────────────────────────────────────────────


  constructor() {
    this.reset();
  }

  public reset(): void {
    this.regs.fill(0);
    // Default initial register values for Game Boy
    this.write(0xff10, 0x80);
    this.write(0xff11, 0xbf);
    this.write(0xff12, 0xf3);
    this.write(0xff14, 0xbf);
    this.write(0xff16, 0x3f);
    this.write(0xff17, 0x00);
    this.write(0xff19, 0xbf);
    this.write(0xff1a, 0x7f);
    this.write(0xff1b, 0xff);
    this.write(0xff1c, 0x9f);
    this.write(0xff1e, 0xbf);
    this.write(0xff20, 0xff);
    this.write(0xff21, 0x00);
    this.write(0xff22, 0x00);
    this.write(0xff23, 0xbf);
    this.write(0xff24, 0x77);
    this.write(0xff25, 0xff);
    this.write(0xff26, 0xf1);

    for (let i = 0; i < 4; i++) {
      const isOff = this.snd[i]?.channelOff ?? false;
      this.snd[i] = {
        enable: false,
        channelOff: isOff,
        vol: 0,
        len: 0,
        cnt: 0,
        freq: 0,
        bit: 0,
        swpCnt: 0,
        envCnt: 0,
      };
    }
    this.lfsr = 0x7fff;
    this.swpClk = 0;
    this.envClk = 0;
    this.lenClk = 0;
    this.freqClk = 0;
    this.freq4Clk = 0;
  }

  public read(addr: number): number {
    if (addr >= 0xff10 && addr < 0xff40) {
      return this.regs[addr - 0xff10];
    }
    return 0xff;
  }

  public write(addr: number, val: number): void {
    if (addr < 0xff10 || addr >= 0xff40) return;
    const offset = addr - 0xff10;
    this.regs[offset] = val & 0xff;

    // Handle register writes
    switch (addr) {
      // Channel 1
      case 0xff12: {
        this.snd[0].vol = (val >> 4) & 0x0f;
        this.snd[0].envCnt = 0;
        if ((val & 0xf8) === 0) {
          this.snd[0].enable = false;
        }
        break;
      }
      case 0xff13:
      case 0xff14: {
        this.snd[0].freq = this.regs[0x03] | ((this.regs[0x04] & 0x07) << 8);
        if (val & 0x80 && addr === 0xff14) {
          this.snd[0].vol = this.regs[0x02] >> 4;
          this.snd[0].len = 64 - (this.regs[0x01] & 63);
          this.snd[0].cnt = 0;
          this.snd[0].swpCnt = 0;
          this.snd[0].envCnt = 0;
          this.snd[0].enable = true;
          this.regs[0x04] &= 0x7f;
        }
        break;
      }

      // Channel 2
      case 0xff17: {
        this.snd[1].vol = (val >> 4) & 0x0f;
        this.snd[1].envCnt = 0;
        if ((val & 0xf8) === 0) {
          this.snd[1].enable = false;
        }
        break;
      }
      case 0xff18:
      case 0xff19: {
        this.snd[1].freq = this.regs[0x08] | ((this.regs[0x09] & 0x07) << 8);
        if (val & 0x80 && addr === 0xff19) {
          this.snd[1].vol = this.regs[0x07] >> 4;
          this.snd[1].len = 64 - (this.regs[0x06] & 63);
          this.snd[1].cnt = 0;
          this.snd[1].envCnt = 0;
          this.snd[1].enable = true;
          this.regs[0x09] &= 0x7f;
        }
        break;
      }

      // Channel 3
      case 0xff1a: {
        this.snd[2].enable = (val & 0x80) !== 0;
        break;
      }
      case 0xff1d:
      case 0xff1e: {
        this.snd[2].freq = this.regs[0x0d] | ((this.regs[0x0e] & 0x07) << 8);
        if (val & 0x80 && addr === 0xff1e) {
          this.snd[2].len = 256 - this.regs[0x0b];
          this.snd[2].cnt = 0;
          this.snd[2].enable = true;
          this.regs[0x0a] |= 0x80;
          this.regs[0x0e] &= 0x7f;
        }
        break;
      }

      // Channel 4
      case 0xff21: {
        this.snd[3].vol = (val >> 4) & 0x0f;
        this.snd[3].envCnt = 0;
        if ((val & 0xf8) === 0) {
          this.snd[3].enable = false;
        }
        break;
      }
      case 0xff22:
      case 0xff23: {
        this.updateNoiseFreq();
        if (val & 0x80 && addr === 0xff23) {
          this.snd[3].vol = this.regs[0x11] >> 4;
          this.snd[3].len = 64 - (this.regs[0x10] & 63);
          this.snd[3].envCnt = 0;
          this.snd[3].enable = true;
          this.lfsr = 0x7fff;
          this.regs[0x13] &= 0x7f;
        }
        break;
      }
    }
  }

  private updateNoiseFreq(): void {
    const nr43 = this.regs[0x12]; // $FF22 (NR43)
    const ratio = nr43 & 0x07;
    const shift = (nr43 >> 4) & 0x0f;

    // Game Boy APU master clock = 8,388,608 Hz in this emulator
    // LFSR shift frequency: f = 524288 / (ratio === 0 ? 0.5 : ratio) / (2^(shift + 1))
    // In 8.388MHz APU cycles: period = (ratio === 0 ? 16 : 32 * ratio) * (1 << shift)
    if (ratio === 0) {
      this.snd[3].freq = 16 * (1 << shift);
    } else {
      this.snd[3].freq = 32 * ratio * (1 << shift);
    }
    if (this.snd[3].freq < 1) this.snd[3].freq = 1;
  }

  /**
   * NextLFSRBit: Accurate Game Boy 15-bit / 7-bit LFSR pseudo-random noise generator
   */
  private nextLFSRBit(narrow: boolean): number {
    const bit = (this.lfsr & 1) ^ ((this.lfsr >> 1) & 1);
    this.lfsr = (this.lfsr >> 1) | (bit << 14);
    if (narrow) {
      this.lfsr = (this.lfsr & ~0x40) | (bit << 6);
    }
    return (~this.lfsr) & 1;
  }

  /**
   * Emulates `cycles` of the Game Boy APU hardware (4,194,304 Hz master clock).
   * Returns current left and right output samples in range [-1.0, 1.0].
   */
  public stepCycles(cycles: number): { left: number; right: number } {
    // 1. Hardware Frequency Sweep on CH1 (at 128 Hz = 65,536 cycles)
    if (this.snd[0].enable && (this.regs[0x00] & 0x70) > 0) {
      this.swpClk += cycles;
      if (this.swpClk >= 65536) {
        this.swpClk -= 65536;
        this.snd[0].swpCnt++;
        const sweepTime = (this.regs[0x00] >> 4) & 0x07;
        if (sweepTime > 0 && this.snd[0].swpCnt >= sweepTime) {
          this.snd[0].swpCnt = 0;
          const shift = this.regs[0x00] & 0x07;
          if (this.regs[0x00] & 0x08) {
            // Decrease pitch
            this.snd[0].freq -= this.snd[0].freq >> shift;
            if (this.snd[0].freq < 0) this.snd[0].freq = 0;
          } else {
            // Increase pitch
            this.snd[0].freq += this.snd[0].freq >> shift;
            if (this.snd[0].freq > 2047) {
              this.snd[0].freq = 2047;
              this.snd[0].enable = false;
            }
          }
          this.regs[0x03] = this.snd[0].freq & 0xff;
          this.regs[0x04] = (this.regs[0x04] & 0xf8) | ((this.snd[0].freq >> 8) & 0x07);
        }
      }
    }

    // 2. Hardware Volume Envelope (at 64 Hz = 131,072 cycles)
    this.envClk += cycles;
    if (this.envClk >= 131072) {
      this.envClk -= 131072;

      // CH1 Envelope
      if (this.snd[0].enable && (this.regs[0x02] & 0x07) > 0) {
        this.snd[0].envCnt++;
        if (this.snd[0].envCnt >= (this.regs[0x02] & 0x07)) {
          this.snd[0].envCnt = 0;
          if (this.regs[0x02] & 0x08) {
            if (this.snd[0].vol < 15) this.snd[0].vol++;
          } else {
            if (this.snd[0].vol > 0) this.snd[0].vol--;
          }
          this.regs[0x02] = (this.regs[0x02] & 0x0f) | (this.snd[0].vol << 4);
        }
      }

      // CH2 Envelope
      if (this.snd[1].enable && (this.regs[0x07] & 0x07) > 0) {
        this.snd[1].envCnt++;
        if (this.snd[1].envCnt >= (this.regs[0x07] & 0x07)) {
          this.snd[1].envCnt = 0;
          if (this.regs[0x07] & 0x08) {
            if (this.snd[1].vol < 15) this.snd[1].vol++;
          } else {
            if (this.snd[1].vol > 0) this.snd[1].vol--;
          }
          this.regs[0x07] = (this.regs[0x07] & 0x0f) | (this.snd[1].vol << 4);
        }
      }

      // CH4 Envelope
      if (this.snd[3].enable && (this.regs[0x11] & 0x07) > 0) {
        this.snd[3].envCnt++;
        if (this.snd[3].envCnt >= (this.regs[0x11] & 0x07)) {
          this.snd[3].envCnt = 0;
          if (this.regs[0x11] & 0x08) {
            if (this.snd[3].vol < 15) this.snd[3].vol++;
          } else {
            if (this.snd[3].vol > 0) this.snd[3].vol--;
          }
          this.regs[0x11] = (this.regs[0x11] & 0x0f) | (this.snd[3].vol << 4);
        }
      }
    }

    // 3. Hardware Sound Length Counter (at 256 Hz = 32,768 cycles)
    this.lenClk += cycles;
    if (this.lenClk >= 32768) {
      this.lenClk -= 32768;

      if (this.snd[0].enable) {
        this.snd[0].len--;
        if (this.snd[0].len <= 0 && this.regs[0x04] & 0x40) {
          this.snd[0].enable = false;
        }
      }
      if (this.snd[1].enable) {
        this.snd[1].len--;
        if (this.snd[1].len <= 0 && this.regs[0x09] & 0x40) {
          this.snd[1].enable = false;
        }
      }
      if (this.snd[2].enable) {
        this.snd[2].len--;
        if (this.snd[2].len <= 0 && this.regs[0x0e] & 0x40) {
          this.snd[2].enable = false;
          this.regs[0x0a] &= 0x7f;
        }
      }
      if (this.snd[3].enable) {
        this.snd[3].len--;
        if (this.snd[3].len <= 0 && this.regs[0x13] & 0x40) {
          this.snd[3].enable = false;
        }
      }
    }

    // 4. Update Frequencies / Clocks for Channels 1, 2, 3
    this.freqClk += cycles;
    if (this.freqClk >= 4) {
      const n = this.freqClk >> 2;
      this.freqClk -= n << 2;

      // CH1 Frequency
      if (this.snd[0].enable) {
        const period = Math.max(1, (2048 - this.snd[0].freq) << 4);
        this.snd[0].cnt = (this.snd[0].cnt + n) % period;
      }
      // CH2 Frequency
      if (this.snd[1].enable) {
        const period = Math.max(1, (2048 - this.snd[1].freq) << 4);
        this.snd[1].cnt = (this.snd[1].cnt + n) % period;
      }
      // CH3 Frequency (Wave)
      if (this.snd[2].enable) {
        const period = Math.max(1, (2048 - this.snd[2].freq) << 5);
        this.snd[2].cnt = (this.snd[2].cnt + n) % period;
      }
    }

    // 5. Synthesize Channel Outputs (ls and rs)
    let ls1 = 0, rs1 = 0;
    let ls2 = 0, rs2 = 0;
    let ls3 = 0, rs3 = 0;
    let ls4 = 0, rs4 = 0;

    const term = this.regs[0x15]; // NR51 ($FF25) stereo routing

    // CH1 Output
    if (!this.snd[0].channelOff && this.snd[0].enable) {
      const div = Math.max(1, 2048 - this.snd[0].freq);
      let stage = Math.floor(this.snd[0].cnt / div) >> 1;
      if (stage > 7) stage = 7;
      const duty = (this.regs[0x01] >> 6) & 0x03;
      this.snd[0].bit = BIT_DUTY[duty][stage];
      const v = VOL_TABLE[this.snd[0].vol];
      const out = this.snd[0].bit > 0 ? v : -v;
      if (term & 0x01) rs1 = out; // Right CH1
      if (term & 0x10) ls1 = out; // Left CH1
    }

    // CH2 Output
    if (!this.snd[1].channelOff && this.snd[1].enable) {
      const div = Math.max(1, 2048 - this.snd[1].freq);
      let stage = Math.floor(this.snd[1].cnt / div) >> 1;
      if (stage > 7) stage = 7;
      const duty = (this.regs[0x06] >> 6) & 0x03;
      this.snd[1].bit = BIT_DUTY[duty][stage];
      const v = VOL_TABLE[this.snd[1].vol];
      const out = this.snd[1].bit > 0 ? v : -v;
      if (term & 0x02) rs2 = out; // Right CH2
      if (term & 0x20) ls2 = out; // Left CH2
    }

    // CH3 Output (Custom Wave)
    if (!this.snd[2].channelOff && this.snd[2].enable) {
      const div = Math.max(1, 2048 - this.snd[2].freq);
      let stage = Math.floor(this.snd[2].cnt / div);
      if (stage > 31) stage = 31;

      // Read from Wave RAM ($FF30..$FF3F = regs[0x20..0x2F])
      const waveByte = this.regs[0x20 + (stage >> 1)];
      let sample = (stage & 1) ? (waveByte & 0x0f) : (waveByte >> 4);

      // Volume scale (NR32 $FF1C bits 6-5: 0=mute, 1=100%, 2=50%, 3=25%)
      const level = (this.regs[0x0c] >> 5) & 0x03;
      let out = 0;
      if (level > 0) {
        let centered = sample - 7.5;
        if (level === 2) {
          centered *= 0.5; // 50%
        } else if (level === 3) {
          centered *= 0.25; // 25%
        }
        out = centered * 16; // -120 .. +120
      }
      if (term & 0x04) rs3 = out;
      if (term & 0x40) ls3 = out;
    }

    // CH4 Output (LFSR Noise)
    if (!this.snd[3].channelOff && this.snd[3].enable) {
      this.freq4Clk += cycles;
      const period = Math.max(1, this.snd[3].freq);
      const narrow = (this.regs[0x12] & 0x08) !== 0; // 7-bit if bit 3 set
      while (this.freq4Clk >= period) {
        this.freq4Clk -= period;
        this.snd[3].bit = this.nextLFSRBit(narrow);
      }
      const v = VOL_TABLE[this.snd[3].vol];
      const out = this.snd[3].bit > 0 ? v : -v;
      if (term & 0x08) rs4 = out;
      if (term & 0x80) ls4 = out;
    }

    // ── Write per-channel samples into oscilloscope ring buffers ──
    // Normalize each channel independently to [-1, +1] (max amplitude = 127)
    const pos = this.oscWritePos;
    this.oscBuf[0][pos] = (ls1 !== 0 || rs1 !== 0) ? (ls1 + rs1) / 254 : 0;
    this.oscBuf[1][pos] = (ls2 !== 0 || rs2 !== 0) ? (ls2 + rs2) / 254 : 0;
    this.oscBuf[2][pos] = (ls3 !== 0 || rs3 !== 0) ? (ls3 + rs3) / 254 : 0;
    this.oscBuf[3][pos] = (ls4 !== 0 || rs4 !== 0) ? (ls4 + rs4) / 254 : 0;
    this.oscWritePos = (pos + 1) & (GameBoyApu.OSC_BUF_SIZE - 1);
    // ──────────────────────────────────────────────────────────────

    // Master Volume Scaling (NR50 $FF24)
    const volL = ((this.regs[0x14] >> 4) & 0x07) + 1;
    const volR = (this.regs[0x14] & 0x07) + 1;

    const totalL = ((ls1 + ls2 + ls3 + ls4) * volL) / 8;
    const totalR = ((rs1 + rs2 + rs3 + rs4) * volR) / 8;

    // Normalize: 4 channels * 128 max = 512 max amplitude -> [-1.0, 1.0]
    return {
      left: Math.max(-1.0, Math.min(1.0, totalL / 512.0)),
      right: Math.max(-1.0, Math.min(1.0, totalR / 512.0)),
    };
  }

  /**
   * Returns a linear snapshot of the oscilloscope ring buffer for the given channel,
   * starting from the oldest sample so it reads left-to-right in time.
   * @param ch - Channel index (0–3)
   * @param length - How many samples to snapshot (defaults to OSC_BUF_SIZE)
   */
  public getOscSnapshot(ch: number, length = GameBoyApu.OSC_BUF_SIZE): Float32Array {
    const buf = this.oscBuf[ch];
    const snap = new Float32Array(length);
    const start = (this.oscWritePos - length + GameBoyApu.OSC_BUF_SIZE) & (GameBoyApu.OSC_BUF_SIZE - 1);
    for (let i = 0; i < length; i++) {
      snap[i] = buf[(start + i) & (GameBoyApu.OSC_BUF_SIZE - 1)];
    }
    return snap;
  }
}
