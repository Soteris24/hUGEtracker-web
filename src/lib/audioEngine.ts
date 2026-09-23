import { TSong, NO_NOTE } from '../types/uge';
import { GameBoyApu } from './gameboyApu';
import { HUGEDriverEngine, NOTE_TABLE, getNotePoly } from './hUGEDriverEngine';

export interface PlaybackState {
  isPlaying: boolean;
  orderIndex: number;
  row: number;
  tick: number;
}

export type PlaybackCallback = (state: PlaybackState) => void;
export type MeterCallback = (meters: [number, number, number, number]) => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private gainNode: GainNode | null = null;

  public apu: GameBoyApu;
  public driver: HUGEDriverEngine;

  private onStateChange: PlaybackCallback | null = null;
  private onMeterChange: MeterCallback | null = null;

  private samplesUntilNextTick = 0;
  private masterVolume = 0.3;
  private uiUpdateCounter = 0;

  // Single note preview timer
  private previewTimeout: any = null;

  constructor() {
    this.apu = new GameBoyApu();
    this.driver = new HUGEDriverEngine(this.apu);
  }

  public init(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      // ScriptProcessor for continuous bit-accurate Game Boy sample synthesis
      this.scriptNode = this.ctx.createScriptProcessor(2048, 0, 2);
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

      this.scriptNode.onaudioprocess = (e) => this.handleAudioProcess(e);

      this.scriptNode.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setCallbacks(onState: PlaybackCallback, onMeter: MeterCallback): void {
    this.onStateChange = onState;
    this.onMeterChange = onMeter;
  }

  public setSong(song: TSong): void {
    this.driver.setSong(song);
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  public setChannelMute(channel: number, isMuted: boolean): void {
    this.apu.snd[channel].channelOff = isMuted;
  }

  public setChannelSolo(channel: number, isSolo: boolean): void {
    for (let i = 0; i < 4; i++) {
      if (isSolo) {
        this.apu.snd[i].channelOff = i !== channel;
      } else {
        this.apu.snd[i].channelOff = false;
      }
    }
  }

  public play(startOrder = 0, startRow = 0): void {
    this.init();
    this.samplesUntilNextTick = 0;
    this.driver.start(startOrder, startRow);
    this.notifyState();
  }

  public stop(): void {
    this.driver.stop();
    this.notifyState();
    if (this.onMeterChange) {
      this.onMeterChange([0, 0, 0, 0]);
    }
  }

  public panic(): void {
    this.driver.stop();
    this.apu.reset();
    this.notifyState();
    if (this.onMeterChange) {
      this.onMeterChange([0, 0, 0, 0]);
    }
  }

  /**
   * Auditions a single note with instrument parameters on the Game Boy APU.
   */
  public previewNote(channel: number, note: number, instNumber: number): void {
    this.init();
    if (!this.driver.song) return;

    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
    }

    const instIdx = Math.max(0, instNumber - 1);

    if (channel === 0 || channel === 1) {
      const inst = this.driver.song.dutyInstruments[instIdx];
      if (inst) {
        const sweep = (inst.sweepTime << 4) | (inst.sweepIncDec << 3) | (inst.sweepShift & 7);
        const len = (inst.duty << 6) | (inst.length & 0x3f);
        const volDir = inst.volSweepDirection === 0 ? 1 : 0;
        const env = (inst.initialVolume << 4) | (volDir << 3) | (inst.volSweepAmount & 7);
        const period = NOTE_TABLE[note] ?? 1046;

        if (channel === 0) {
          this.apu.write(0xff10, sweep);
          this.apu.write(0xff11, len);
          this.apu.write(0xff12, env);
          this.apu.write(0xff13, period & 0xff);
          this.apu.write(0xff14, ((period >> 8) & 0x07) | 0x80);
        } else {
          this.apu.write(0xff16, len);
          this.apu.write(0xff17, env);
          this.apu.write(0xff18, period & 0xff);
          this.apu.write(0xff19, ((period >> 8) & 0x07) | 0x80);
        }
      }
    } else if (channel === 2) {
      const inst = this.driver.song.waveInstruments[instIdx];
      if (inst) {
        this.driver.loadWaveform(inst.waveform);
        this.apu.write(0xff1a, 0x00);
        this.apu.write(0xff1a, 0x80);
        this.apu.write(0xff1b, inst.length & 0xff);
        this.apu.write(0xff1c, (inst.outputLevel & 3) << 5);
        const period = NOTE_TABLE[note] ?? 1046;
        this.apu.write(0xff1d, period & 0xff);
        this.apu.write(0xff1e, ((period >> 8) & 0x07) | 0x80);
      }
    } else if (channel === 3) {
      const inst = this.driver.song.noiseInstruments[instIdx];
      if (inst) {
        const volDir = inst.volSweepDirection === 0 ? 1 : 0;
        const env = (inst.initialVolume << 4) | (volDir << 3) | (inst.volSweepAmount & 7);
        const stepWidth = inst.counterStep ? 0x08 : 0x00;
        const poly = getNotePoly(note) | stepWidth;
        this.apu.write(0xff20, inst.length & 0x3f);
        this.apu.write(0xff21, env);
        this.apu.write(0xff22, poly);
        this.apu.write(0xff23, 0x80);
      }
    }

    // Auto-silence preview note after 600ms if song is not playing
    if (!this.driver.isPlaying) {
      this.previewTimeout = setTimeout(() => {
        if (!this.driver.isPlaying) {
          this.apu.snd[channel].enable = false;
        }
      }, 600);
    }
  }

  private handleAudioProcess(e: AudioProcessingEvent): void {
    const outputL = e.outputBuffer.getChannelData(0);
    const outputR = e.outputBuffer.getChannelData(1);
    const bufferSize = outputL.length;
    const sampleRate = e.outputBuffer.sampleRate;

    // Calculate Game Boy tick rate
    // Default VBlank: 59.7275 Hz (Game Boy screen refresh rate)
    // Hardware timer interrupt: TAC clock is 4096 Hz, overflowing every (256 - TMA) ticks
    let tickRate = 59.7275;
    if (this.driver.song?.timerEnabled) {
      const divider = this.driver.song.timerDivider ?? 0;
      const count = Math.max(1, 256 - divider);
      tickRate = 4096 / count;
    }
    const samplesPerTick = sampleRate / tickRate;

    // Cycles per sample (Game Boy APU synthesis clock is calibrated at 8,388,608 Hz)
    const cyclesPerSample = 8388608 / sampleRate;

    for (let i = 0; i < bufferSize; i++) {
      if (this.driver.isPlaying) {
        if (this.samplesUntilNextTick <= 0) {
          this.driver.tick();
          this.samplesUntilNextTick += samplesPerTick;
        }
        this.samplesUntilNextTick--;
      }

      // Synthesize 1 sample from Game Boy APU
      const sample = this.apu.stepCycles(cyclesPerSample);
      outputL[i] = sample.left;
      outputR[i] = sample.right;
    }

    // Periodically notify UI of playback position and meters with low latency (~40ms)
    this.uiUpdateCounter++;
    this.notifyState();
    if (this.onMeterChange) {
      const m1 = this.apu.snd[0].enable ? this.apu.snd[0].vol / 15 : 0;
      const m2 = this.apu.snd[1].enable ? this.apu.snd[1].vol / 15 : 0;
      const m3 = this.apu.snd[2].enable ? 0.8 : 0;
      const m4 = this.apu.snd[3].enable ? this.apu.snd[3].vol / 15 : 0;
      this.onMeterChange([m1, m2, m3, m4]);
    }
  }

  private notifyState(): void {
    if (this.onStateChange) {
      this.onStateChange({
        isPlaying: this.driver.isPlaying,
        orderIndex: this.driver.isPlaying ? this.driver.activePlayingOrder : this.driver.currentOrder,
        row: this.driver.isPlaying ? this.driver.activePlayingRow : this.driver.currentRow,
        tick: this.driver.currentTick,
      });
    }
  }

  public destroy(): void {
    this.stop();
    if (this.scriptNode) {
      this.scriptNode.disconnect();
    }
    if (this.ctx) {
      this.ctx.close();
    }
  }
}

export const audioEngine = new AudioEngine();
