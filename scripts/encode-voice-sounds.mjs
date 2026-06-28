import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const workDir = path.join(root, "public/sounds/.work");
const outDir = path.join(root, "public/sounds");

const lameSource = fs.readFileSync(path.join(__dirname, "vendor/lame.min.js"), "utf8");
const lamejs = new Function(`${lameSource}; return lamejs;`)();
if (!lamejs?.Mp3Encoder) {
  throw new Error("Failed to load lamejs Mp3Encoder");
}

const SAY_RATE = 180;
const TARGET_PEAK = 0.92;
const KBPS = 64;

const clips = [
  { name: "cart-thanks", text: "ありがとうございます。" },
  { name: "go-to-datetime", text: "受取日時に、進みます。" },
  {
    name: "reservation-thanks",
    text: "ご予約ありがとうございました。ご来店を心よりお待ちしております。",
  },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function generateAiff(name, text) {
  const aiff = path.join(workDir, `${name}.aiff`);
  execFileSync("say", ["-v", "Kyoko", "-r", String(SAY_RATE), "-o", aiff, text]);
  return aiff;
}

function aiffToWav(aiff, wav) {
  execFileSync("afconvert", ["-f", "WAVE", "-d", "LEI16@24000", aiff, wav]);
}

function readWavPcm(filePath) {
  const buf = fs.readFileSync(filePath);
  const channels = buf.readUInt16LE(22);
  let offset = 12;

  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString("ascii", offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    if (chunkId === "data") {
      const dataOffset = offset + 8;
      const sampleCount = chunkSize / 2;
      const interleaved = new Int16Array(
        buf.buffer,
        buf.byteOffset + dataOffset,
        sampleCount,
      );

      if (channels === 1) {
        return { sampleRate: buf.readUInt32LE(24), samples: Int16Array.from(interleaved) };
      }

      const mono = new Int16Array(sampleCount / channels);
      for (let i = 0; i < mono.length; i += 1) {
        mono[i] = interleaved[i * channels];
      }
      return { sampleRate: buf.readUInt32LE(24), samples: mono };
    }
    offset += 8 + chunkSize;
  }

  throw new Error(`No data chunk in ${filePath}`);
}

function normalizeSamples(samples) {
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  if (peak === 0) {
    return samples;
  }

  const targetPeak = Math.floor(32767 * TARGET_PEAK);
  const gain = targetPeak / peak;
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    out[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * gain)));
  }
  return out;
}

function encodeMp3(samples, sampleRate, outPath) {
  const encoder = new lamejs.Mp3Encoder(1, sampleRate, KBPS);
  const blockSize = 1152;
  const mp3Chunks = [];

  for (let i = 0; i < samples.length; i += blockSize) {
    const chunk = samples.subarray(i, i + blockSize);
    const mp3buf = encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) {
      mp3Chunks.push(Buffer.from(mp3buf));
    }
  }

  const flush = encoder.flush();
  if (flush.length > 0) {
    mp3Chunks.push(Buffer.from(flush));
  }

  fs.writeFileSync(outPath, Buffer.concat(mp3Chunks));
}

ensureDir(workDir);

for (const clip of clips) {
  console.log(`Processing ${clip.name}...`);
  generateAiff(clip.name, clip.text);
  const wav = path.join(workDir, `${clip.name}.wav`);
  aiffToWav(path.join(workDir, `${clip.name}.aiff`), wav);
  const { sampleRate, samples } = readWavPcm(wav);
  const normalized = normalizeSamples(samples);
  const outPath = path.join(outDir, `${clip.name}.mp3`);
  encodeMp3(normalized, sampleRate, outPath);
  console.log(`Wrote ${outPath} (${normalized.length} samples @ ${sampleRate}Hz)`);
}
