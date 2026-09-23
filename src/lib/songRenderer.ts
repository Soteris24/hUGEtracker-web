import { TSong } from '../types/uge';
import { GameBoyApu } from './gameboyApu';
import { HUGEDriverEngine } from './hUGEDriverEngine';

export interface RenderOptions {
  sampleRate?: number;
  loopCount?: number;
  maxDurationSeconds?: number;
  onProgress?: (progress: number, statusText: string) => void;
}

export function encodeWav(left: Float32Array, right: Float32Array, sampleRate: number): Blob {
  const numSamples = left.length;
  const numChannels = 2;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Helper to write ASCII strings
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample (16)

  // data subchunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave left and right channels as signed 16-bit integers
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Clamp sample between -1 and 1
    const sL = Math.max(-1, Math.min(1, left[i]));
    const sR = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(offset, sL < 0 ? sL * 0x8000 : sL * 0x7fff, true);
    offset += 2;
    view.setInt16(offset, sR < 0 ? sR * 0x8000 : sR * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export async function renderSongToWav(
  song: TSong,
  options: RenderOptions = {}
): Promise<{ blob: Blob; url: string; duration: number }> {
  const sampleRate = options.sampleRate || 44100;
  const targetLoops = options.loopCount || 1;
  const maxDuration = options.maxDurationSeconds || 300; // max 5 minutes safety
  const onProgress = options.onProgress;

  const apu = new GameBoyApu();
  const driver = new HUGEDriverEngine(apu);
  driver.setSong(song);
  driver.start(0, 0);

  // Calculate Game Boy tick rate
  let tickRate = 59.7275;
  if (song.timerEnabled) {
    const divider = song.timerDivider ?? 0;
    const count = Math.max(1, 256 - divider);
    tickRate = 4096 / count;
  }
  const samplesPerTick = sampleRate / tickRate;
  const cyclesPerSample = 8388608 / sampleRate;

  const maxTotalSamples = Math.floor(maxDuration * sampleRate);
  const leftChunks: Float32Array[] = [];
  const rightChunks: Float32Array[] = [];

  const chunkSize = 16384;
  let currentChunkL = new Float32Array(chunkSize);
  let currentChunkR = new Float32Array(chunkSize);
  let chunkSampleIdx = 0;

  let totalSamplesRendered = 0;
  let samplesUntilNextTick = 0;
  let completedLoops = 0;
  let lastOrder = 0;
  let highestOrderSeen = 0;
  let isDone = false;

  const orderCount = Math.max(
    song.orderMatrix[0]?.length || 1,
    song.orderMatrix[1]?.length || 1,
    song.orderMatrix[2]?.length || 1,
    song.orderMatrix[3]?.length || 1
  );

  const estimatedTotalSamples = Math.min(
    maxTotalSamples,
    Math.max(sampleRate * 15, orderCount * 64 * (song.ticksPerRow || 6) * samplesPerTick * targetLoops)
  );

  while (!isDone && totalSamplesRendered < maxTotalSamples) {
    // Process one chunk
    for (let c = 0; c < chunkSize; c++) {
      if (samplesUntilNextTick <= 0) {
        driver.tick();
        samplesUntilNextTick += samplesPerTick;

        const curOrder = driver.activePlayingOrder;
        if (curOrder > highestOrderSeen) highestOrderSeen = curOrder;

        // Loop detection: if order index jumps back to an earlier point (via Bxx or reaching order boundary)
        if (curOrder < lastOrder) {
          completedLoops++;
          if (completedLoops >= targetLoops) {
            isDone = true;
            break;
          }
        }
        lastOrder = curOrder;
      }
      samplesUntilNextTick--;

      const sample = apu.stepCycles(cyclesPerSample);
      currentChunkL[chunkSampleIdx] = sample.left * 0.5;
      currentChunkR[chunkSampleIdx] = sample.right * 0.5;
      chunkSampleIdx++;
      totalSamplesRendered++;

      if (chunkSampleIdx >= chunkSize) {
        leftChunks.push(currentChunkL);
        rightChunks.push(currentChunkR);
        currentChunkL = new Float32Array(chunkSize);
        currentChunkR = new Float32Array(chunkSize);
        chunkSampleIdx = 0;
      }
    }

    if (onProgress) {
      const progress = Math.min(0.98, totalSamplesRendered / estimatedTotalSamples);
      onProgress(progress, `Rendering audio... ${Math.round(progress * 100)}%`);
      // Yield to event loop periodically
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  // Flush remaining samples in active chunk
  if (chunkSampleIdx > 0) {
    leftChunks.push(currentChunkL.subarray(0, chunkSampleIdx));
    rightChunks.push(currentChunkR.subarray(0, chunkSampleIdx));
  }

  // Concatenate all chunks into final single Float32Arrays
  const finalL = new Float32Array(totalSamplesRendered);
  const finalR = new Float32Array(totalSamplesRendered);
  let copyOffset = 0;
  for (let i = 0; i < leftChunks.length; i++) {
    finalL.set(leftChunks[i], copyOffset);
    finalR.set(rightChunks[i], copyOffset);
    copyOffset += leftChunks[i].length;
  }

  // Apply a clean 1.5-second fade out at the end
  const fadeSamples = Math.min(Math.floor(sampleRate * 1.5), totalSamplesRendered);
  const fadeStart = totalSamplesRendered - fadeSamples;
  for (let i = 0; i < fadeSamples; i++) {
    const mult = 1 - i / fadeSamples;
    finalL[fadeStart + i] *= mult;
    finalR[fadeStart + i] *= mult;
  }

  if (onProgress) {
    onProgress(1.0, 'Encoding 16-bit Stereo WAV...');
  }

  const blob = encodeWav(finalL, finalR, sampleRate);
  const url = URL.createObjectURL(blob);
  const duration = totalSamplesRendered / sampleRate;

  return { blob, url, duration };
}
