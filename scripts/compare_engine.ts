import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { parseUgeBuffer } from '../src/lib/ugeParser';
import { GameBoyApu } from '../src/lib/gameboyApu';
import { HUGEDriverEngine } from '../src/lib/hUGEDriverEngine';

const UGE2SOURCE = 'C:\\Users\\soter\\Downloads\\hUGETracker-1.0.11-windows\\uge2source.exe';
const RGBASM = 'C:\\Users\\soter\\Downloads\\hUGETracker-1.0.11-windows\\rgbasm.exe';
const RGBLINK = 'C:\\Users\\soter\\Downloads\\hUGETracker-1.0.11-windows\\rgblink.exe';
const GBSPLAY = 'C:\\Users\\soter\\Downloads\\gbsplay-0.0.102_Windows\\gbsplay-0.0.102\\gbsplay.exe';
const HUGEDRIVER_DIR = 'C:\\Users\\soter\\Downloads\\hUGETracker-1.0.11-windows\\hUGEDriver';
const WORK_DIR = path.resolve('test_comparison');

if (!fs.existsSync(WORK_DIR)) {
  fs.mkdirSync(WORK_DIR, { recursive: true });
}

function writeWav(filePath: string, samplesL: Float32Array, samplesR: Float32Array, sampleRate = 44100) {
  const numSamples = samplesL.length;
  const numChannels = 2;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sL = Math.max(-1, Math.min(1, samplesL[i]));
    const sR = Math.max(-1, Math.min(1, samplesR[i]));
    buffer.writeInt16LE(Math.round(sL < 0 ? sL * 32768 : sL * 32767), offset);
    offset += 2;
    buffer.writeInt16LE(Math.round(sR < 0 ? sR * 32768 : sR * 32767), offset);
    offset += 2;
  }

  fs.writeFileSync(filePath, buffer);
}

function readWav(filePath: string): { sampleRate: number; channels: number; samplesL: Float32Array; samplesR: Float32Array } {
  const buf = fs.readFileSync(filePath);
  const sampleRate = buf.readUInt32LE(24);
  const channels = buf.readUInt16LE(22);
  const bitsPerSample = buf.readUInt16LE(34);

  // find data chunk
  let dataOffset = 12;
  while (dataOffset < buf.length - 8) {
    const chunkId = buf.toString('ascii', dataOffset, dataOffset + 4);
    const chunkSize = buf.readUInt32LE(dataOffset + 4);
    if (chunkId === 'data') {
      dataOffset += 8;
      break;
    }
    dataOffset += 8 + chunkSize;
  }

  const bytesPerSample = bitsPerSample / 8;
  const numFrames = Math.floor((buf.length - dataOffset) / (channels * bytesPerSample));
  const samplesL = new Float32Array(numFrames);
  const samplesR = new Float32Array(numFrames);

  let offset = dataOffset;
  for (let i = 0; i < numFrames; i++) {
    const s1 = buf.readInt16LE(offset) / 32768;
    offset += 2;
    const s2 = channels > 1 ? buf.readInt16LE(offset) / 32768 : s1;
    if (channels > 1) offset += 2;
    samplesL[i] = s1;
    samplesR[i] = s2;
  }

  return { sampleRate, channels, samplesL, samplesR };
}

function compileUgeToGbs(ugePath: string, songName: string, timerModulo = 0, timerControl = 0): string {
  const gbsPath = path.join(WORK_DIR, `${songName}.gbs`);
  const songAsm = path.join(WORK_DIR, `${songName}.asm`);
  const songObj = path.join(WORK_DIR, `${songName}.obj`);
  const gbsObj = path.join(WORK_DIR, `${songName}_gbs.obj`);
  const driverObj = path.join(WORK_DIR, 'hUGEDriver.obj');
  const rawGbs = path.join(WORK_DIR, `${songName}_raw.gbs`);

  const desc = `song_${songName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;

  const inc1 = `${HUGEDRIVER_DIR}/include/`.replace(/\\/g, '/');
  const inc2 = `${HUGEDRIVER_DIR}/`.replace(/\\/g, '/');

  // 1. uge2source
  execSync(`"${UGE2SOURCE}" "${ugePath}" ${desc} "${songAsm}"`, { stdio: 'pipe' });

  // 2. rgbasm song
  execSync(`"${RGBASM}" -I "${inc1}" -I "${inc2}" -o "${songObj}" "${songAsm}"`, { stdio: 'pipe' });

  // 3. rgbasm gbs
  execSync(
    `"${RGBASM}" -I "${inc1}" -I "${inc2}" -DTIMER_MODULO=${timerModulo} -DTIMER_CONTROL=${timerControl} -DGBS_TITLE="${songName}" -DGBS_AUTHOR="Test" -DGBS_COPYRIGHT="2026" -DSONG_DESCRIPTOR=${desc} -o "${gbsObj}" "${HUGEDRIVER_DIR}/gbs.asm"`,
    { stdio: 'pipe' }
  );

  // 4. rgbasm driver (cache if already built)
  if (!fs.existsSync(driverObj)) {
    execSync(`"${RGBASM}" -I "${inc1}" -I "${inc2}" -o "${driverObj}" "${HUGEDRIVER_DIR}/hUGEDriver.asm"`, {
      stdio: 'pipe',
    });
  }

  // 5. rgblink
  execSync(`"${RGBLINK}" -o "${rawGbs}" "${gbsObj}" "${driverObj}" "${songObj}"`, { stdio: 'pipe' });

  // 6. trim header ($400 padding)
  const raw = fs.readFileSync(rawGbs);
  const clean = Buffer.concat([raw.slice(0, 0x70), raw.slice(0x70 + 0x400)]);
  fs.writeFileSync(gbsPath, clean);

  return gbsPath;
}

function exportRefWavWithGbsplay(gbsPath: string, songName: string, channel: number, durationSec: number): string {
  const outWav = path.join(WORK_DIR, `ref_${songName}_ch${channel}.wav`);
  // Mute other channels
  const muteArgs = [1, 2, 3, 4]
    .filter((c) => c !== channel)
    .map((c) => `-${c}`)
    .join(' ');

  // gbsplay outputs to current working directory as gbsplay-1.wav
  const tempWav = path.join(WORK_DIR, 'gbsplay-1.wav');
  if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);

  execSync(`"${GBSPLAY}" -o wav -f 0 -g 0 -T 999 ${muteArgs} -t ${Math.ceil(durationSec)} "${gbsPath}"`, {
    cwd: WORK_DIR,
    stdio: 'ignore',
  });

  if (fs.existsSync(tempWav)) {
    fs.renameSync(tempWav, outWav);
  } else {
    throw new Error(`Failed to generate gbsplay wav for ${songName} CH${channel}`);
  }

  return outWav;
}

function renderEngineWav(song: any, songName: string, channel: number, durationSec: number, sampleRate = 44100): string {
  const outWav = path.join(WORK_DIR, `engine_${songName}_ch${channel}.wav`);

  const apu = new GameBoyApu();
  const driver = new HUGEDriverEngine(apu);
  driver.setSong(song);
  driver.start(0, 0);

  // Solo channel
  for (let ch = 0; ch < 4; ch++) {
    apu.snd[ch].channelOff = ch !== channel - 1;
  }

  let tickRate = 59.7275;
  if (song.timerEnabled) {
    const divider = song.timerDivider ?? 0;
    const count = Math.max(1, 256 - divider);
    tickRate = 4096 / count;
  }

  const samplesPerTick = sampleRate / tickRate;
  const cyclesPerSample = 8388608 / sampleRate;
  const totalSamples = Math.floor(durationSec * sampleRate);

  const samplesL = new Float32Array(totalSamples);
  const samplesR = new Float32Array(totalSamples);

  let samplesUntilNextTick = 0;
  for (let i = 0; i < totalSamples; i++) {
    samplesUntilNextTick--;
    if (samplesUntilNextTick <= 0) {
      driver.tick();
      samplesUntilNextTick += samplesPerTick;
    }
    const sample = apu.stepCycles(cyclesPerSample);
    samplesL[i] = sample.left;
    samplesR[i] = sample.right;
  }

  writeWav(outWav, samplesL, samplesR, sampleRate);
  return outWav;
}

function compareAudios(wavPathRef: string, wavPathEngine: string): { correlation: number; rmsRef: number; rmsEngine: number } {
  const ref = readWav(wavPathRef);
  const eng = readWav(wavPathEngine);

  // Compare on mono mix of first min(lenRef, lenEng) samples
  const N = Math.min(ref.samplesL.length, eng.samplesL.length);
  const sigRef = new Float32Array(N);
  const sigEng = new Float32Array(N);

  let sumRefSq = 0;
  let sumEngSq = 0;
  for (let i = 0; i < N; i++) {
    sigRef[i] = 0.5 * (ref.samplesL[i] + ref.samplesR[i]);
    sigEng[i] = 0.5 * (eng.samplesL[i] + eng.samplesR[i]);
    sumRefSq += sigRef[i] * sigRef[i];
    sumEngSq += sigEng[i] * sigEng[i];
  }

  const rmsRef = Math.sqrt(sumRefSq / N);
  const rmsEngine = Math.sqrt(sumEngSq / N);

  if (rmsRef === 0 && rmsEngine === 0) {
    return { correlation: 1.0, rmsRef: 0, rmsEngine: 0 };
  }
  if (rmsRef === 0 || rmsEngine === 0) {
    return { correlation: 0.0, rmsRef, rmsEngine };
  }

  // Cross-correlation with small offset search (up to ±2000 samples to account for driver startup delay)
  const maxLag = 2000;
  let bestCorr = -1;

  for (let lag = -maxLag; lag <= maxLag; lag += 10) {
    let dot = 0;
    let count = 0;
    for (let i = Math.max(0, -lag); i < Math.min(N, N - lag); i++) {
      dot += sigRef[i] * sigEng[i + lag];
      count++;
    }
    if (count > 0) {
      const normDot = dot / (count * rmsRef * rmsEngine);
      if (normDot > bestCorr) {
        bestCorr = normDot;
      }
    }
  }

  return { correlation: bestCorr, rmsRef, rmsEngine };
}

async function main() {
  const songsToTest = [
    { name: 'MenuLoop', file: 'C:\\Users\\soter\\Source\\Repos\\GBDASH\\music\\MenuLoop.uge', duration: 15 },
    { name: 'DryOut', file: 'C:\\Users\\soter\\Source\\Repos\\GBDASH\\music\\DryOut.uge', duration: 15 },
    { name: 'StereoMadness', file: 'C:\\Users\\soter\\Source\\Repos\\GBDASH\\music\\StereoMadness.uge', duration: 30 },
    { name: 'CantLetGo', file: 'C:\\Users\\soter\\Source\\Repos\\GBDASH\\music\\CantLetGo.uge', duration: 20 },
  ];

  console.log('================================================================');
  console.log('   HUGETRACKER ENGINE vs GBSPLAY PER-CHANNEL AUDIO COMPARISON   ');
  console.log('================================================================\n');

  for (const item of songsToTest) {
    console.log(`>>> TESTING SONG: ${item.name} (${item.duration}s per channel)`);
    const buf = fs.readFileSync(item.file);
    const song = parseUgeBuffer(buf);

    const timerModulo = song.timerEnabled ? (song.timerDivider ?? 0) : 0;
    const timerControl = song.timerEnabled ? 0x04 : 0;

    console.log(`    Compiling ${item.name} to GBS via uge2source + rgbasm...`);
    const gbsPath = compileUgeToGbs(item.file, item.name, timerModulo, timerControl);

    for (let ch = 1; ch <= 4; ch++) {
      process.stdout.write(`    [CH${ch}] Exporting reference & rendering web engine... `);
      const refWav = exportRefWavWithGbsplay(gbsPath, item.name, ch, item.duration);
      const engWav = renderEngineWav(song, item.name, ch, item.duration);

      const ref = readWav(refWav);
      const eng = readWav(engWav);

      // Align onsets
      let startRef = 0;
      for (let i = 0; i < ref.samplesL.length; i++) {
        if (Math.abs(ref.samplesL[i]) > 0.015) { startRef = i; break; }
      }
      let startEng = 0;
      for (let i = 0; i < eng.samplesL.length; i++) {
        if (Math.abs(eng.samplesL[i]) > 0.015) { startEng = i; break; }
      }

      const N = Math.min(ref.samplesL.length - startRef, eng.samplesL.length - startEng, Math.floor((item.duration - 1) * 44100));
      const win = 441;
      const numW = Math.floor(N / win);
      const envR = new Float32Array(numW);
      const envE = new Float32Array(numW);
      for (let w = 0; w < numW; w++) {
        let sR = 0, sE = 0;
        for (let i = 0; i < win; i++) {
          sR += Math.abs(ref.samplesL[startRef + w * win + i]);
          sE += Math.abs(eng.samplesL[startEng + w * win + i]);
        }
        envR[w] = sR / win;
        envE[w] = sE / win;
      }
      let mR = 0, mE = 0;
      for (let i = 0; i < numW; i++) { mR += envR[i]; mE += envE[i]; }
      mR /= numW; mE /= numW;
      let num = 0, dR = 0, dE = 0;
      for (let i = 0; i < numW; i++) {
        const diffR = envR[i] - mR;
        const diffE = envE[i] - mE;
        num += diffR * diffE;
        dR += diffR * diffR;
        dE += diffE * diffE;
      }
      const envCorr = (num / Math.sqrt(dR * dE)) * 100;
      console.log(`Envelope Match: ${envCorr.toFixed(2)}% (Ref onset: ${startRef}, Eng onset: ${startEng})`);
    }
    console.log('');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
