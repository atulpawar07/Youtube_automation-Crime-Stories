const { createServer } = require("node:http");
const { spawn, spawnSync } = require("node:child_process");
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join, extname, basename } = require("node:path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4317);
const OUTPUT_DIR = join(ROOT, "outputs");
const ENV = loadEnv();
const OPENAI_API_KEY = ENV.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const TEXT_MODEL = ENV.OPENAI_TEXT_MODEL || process.env.OPENAI_TEXT_MODEL || "gpt-5";
const IMAGE_MODEL = ENV.OPENAI_IMAGE_MODEL || process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";
const TTS_MODEL = ENV.OPENAI_TTS_MODEL || process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const TTS_VOICE = ENV.OPENAI_TTS_VOICE || process.env.OPENAI_TTS_VOICE || "onyx";
const FFMPEG = resolveFfmpeg();

mkdirSync(OUTPUT_DIR, { recursive: true });

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8"
};

createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/api/status") {
      return sendJson(response, {
        hasOpenAiKey: Boolean(OPENAI_API_KEY),
        hasFfmpeg: Boolean(FFMPEG),
        ffmpegPath: FFMPEG || null,
        textModel: TEXT_MODEL,
        imageModel: IMAGE_MODEL,
        ttsModel: TTS_MODEL
      });
    }

    if (request.method === "POST" && request.url === "/api/research") {
      requireOpenAi();
      const body = await readJson(request);
      const plan = await researchPlan(body.plan);
      return sendJson(response, { plan });
    }

    if (request.method === "POST" && request.url === "/api/render") {
      requireOpenAi();
      const body = await readJson(request);
      const result = await renderPlan(body.plan);
      return sendJson(response, result);
    }

    if (request.method === "POST" && request.url === "/api/render-preview") {
      requireOpenAi();
      const body = await readJson(request);
      const result = await renderPreview(body.plan);
      return sendJson(response, result);
    }

    if (request.method === "POST" && request.url === "/api/remix") {
      const body = await readJson(request);
      const result = await remixExistingJob(body.job);
      return sendJson(response, result);
    }

    return serveStatic(request, response);
  } catch (error) {
    console.error(error);
    return sendJson(response, { error: error.message }, 500);
  }
}).listen(PORT, () => {
  console.log(`History Crime Shorts Studio running at http://localhost:${PORT}`);
});

function loadEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      })
  );
}

function requireOpenAi() {
  if (!OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY. Add it to .env, then restart npm start.");
  }
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sendJson(response, data, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data, null, 2));
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://localhost:${PORT}`);
  const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
  const filePath = join(ROOT, cleanPath);

  if (!filePath.startsWith(ROOT) || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
  response.end(readFileSync(filePath));
}

async function researchPlan(plan) {
  const prompt = [
    "You are a careful historical true-crime Shorts producer.",
    "Create a 60-second YouTube Shorts plan with exactly 10 sections of 6 seconds each.",
    "Research and fact-check the case. Avoid gore, avoid defaming living/private people, and label uncertain claims.",
    "Return only valid JSON matching this shape:",
    "{ title, case: { title, year, location, mystery, clue, twist, caution }, sources: [{title,url,note}], segments: [{section,time,label,title,voiceover,visual,caption,audio,factCheck:{status,note}}] }",
    "Caption must be short and punchy. Voiceover should fit around 6 seconds.",
    "",
    JSON.stringify(plan, null, 2)
  ].join("\n");

  const payload = {
    model: TEXT_MODEL,
    input: prompt,
    text: {
      format: {
        type: "json_object"
      }
    }
  };

  let data;
  try {
    data = await openAiJson("/responses", { ...payload, tools: [{ type: "web_search" }] });
  } catch (error) {
    data = await openAiJson("/responses", payload);
  }
  const text = extractResponseText(data);
  const researched = JSON.parse(text);
  return {
    ...plan,
    ...researched,
    durationSeconds: 60,
    sections: 10,
    secondsPerSection: 6,
    segments: researched.segments.slice(0, 10)
  };
}

async function renderPlan(plan) {
  if (!FFMPEG) {
    throw new Error("ffmpeg is missing. Run powershell -ExecutionPolicy Bypass -File scripts/install-ffmpeg.ps1, then restart npm start.");
  }

  const jobName = `${Date.now()}-${slugify(plan.case.title)}`;
  const jobDir = join(OUTPUT_DIR, jobName);
  const audioDir = join(jobDir, "audio");
  const imageDir = join(jobDir, "images");
  const clipDir = join(jobDir, "clips");
  mkdirSync(audioDir, { recursive: true });
  mkdirSync(imageDir, { recursive: true });
  mkdirSync(clipDir, { recursive: true });
  writeFileSync(join(jobDir, "plan.json"), JSON.stringify(plan, null, 2));

  const clipPaths = [];
  for (const segment of plan.segments) {
    const index = String(segment.section).padStart(2, "0");
    const audioPath = join(audioDir, `${index}.mp3`);
    const imagePath = join(imageDir, `${index}.png`);
    const clipPath = join(clipDir, `${index}.mp4`);

    await createSpeech(segment.voiceover, audioPath);
    await createImage(buildImagePrompt(plan, segment), imagePath);
    await createClip(imagePath, audioPath, clipPath, segment.caption, segment.section);
    clipPaths.push(clipPath);
  }

  const concatPath = join(jobDir, "concat.txt");
  writeFileSync(concatPath, clipPaths.map((clip) => `file '${clip.replaceAll("\\", "/")}'`).join("\n"));
  const finalPath = join(jobDir, "final-short.mp4");
  await run(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", concatPath, "-c", "copy", finalPath]);

  return {
    message: "Assets and final Shorts video are ready.",
    job: jobName,
    files: [
      { label: "Final MP4", url: `/outputs/${jobName}/final-short.mp4` },
      { label: "Plan JSON", url: `/outputs/${jobName}/plan.json` }
    ]
  };
}

async function renderPreview(plan) {
  if (!FFMPEG) {
    throw new Error("ffmpeg is missing. Run powershell -ExecutionPolicy Bypass -File scripts/install-ffmpeg.ps1, then restart npm start.");
  }

  const segment = plan.segments?.[0];
  if (!segment) throw new Error("Preview rendering requires at least one section.");

  const jobName = `${Date.now()}-${slugify(plan.case.title)}-preview`;
  const jobDir = join(OUTPUT_DIR, jobName);
  mkdirSync(jobDir, { recursive: true });
  writeFileSync(join(jobDir, "plan.json"), JSON.stringify(plan, null, 2));

  const audioPath = join(jobDir, "preview.mp3");
  const imagePath = join(jobDir, "preview.png");
  const clipPath = join(jobDir, "preview.mp4");
  await createSpeech(segment.voiceover, audioPath);
  await createImage(buildImagePrompt(plan, segment), imagePath);
  await createClip(imagePath, audioPath, clipPath, segment.caption, segment.section);

  return {
    message: "Preview narration, image, and six-second clip are ready.",
    job: jobName,
    files: [
      { label: "Preview MP4", url: `/outputs/${jobName}/preview.mp4` },
      { label: "Preview image", url: `/outputs/${jobName}/preview.png` },
      { label: "Preview audio", url: `/outputs/${jobName}/preview.mp3` }
    ]
  };
}

async function remixExistingJob(jobName) {
  if (!FFMPEG) {
    throw new Error("ffmpeg is missing. Run powershell -ExecutionPolicy Bypass -File scripts/install-ffmpeg.ps1, then restart npm start.");
  }

  const jobDir = join(OUTPUT_DIR, basename(String(jobName || "")));
  const planPath = join(jobDir, "plan.json");
  if (!existsSync(planPath)) throw new Error("Could not find the saved job plan.");

  const plan = JSON.parse(readFileSync(planPath, "utf8"));
  const remixDir = join(jobDir, "clips-with-music");
  mkdirSync(remixDir, { recursive: true });
  const clipPaths = [];

  for (const segment of plan.segments) {
    const index = String(segment.section).padStart(2, "0");
    const audioPath = join(jobDir, "audio", `${index}.mp3`);
    const imagePath = join(jobDir, "images", `${index}.png`);
    const clipPath = join(remixDir, `${index}.mp4`);
    await createClip(imagePath, audioPath, clipPath, segment.caption, segment.section);
    clipPaths.push(clipPath);
  }

  const concatPath = join(jobDir, "concat-with-music.txt");
  writeFileSync(concatPath, clipPaths.map((clip) => `file '${clip.replaceAll("\\", "/")}'`).join("\n"));
  const finalPath = join(jobDir, "final-short-with-music.mp4");
  await run(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", concatPath, "-c", "copy", finalPath]);

  return {
    message: "Suspense soundtrack mixed into the existing Short.",
    job: basename(jobDir),
    files: [{ label: "Final MP4 with music", url: `/outputs/${basename(jobDir)}/final-short-with-music.mp4` }]
  };
}

async function createSpeech(text, outputPath) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: text,
      response_format: "mp3"
    })
  });

  if (!response.ok) throw new Error(await response.text());
  writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()));
}

async function createImage(prompt, outputPath) {
  const data = await openAiJson("/images/generations", {
    model: IMAGE_MODEL,
    prompt,
    size: "1024x1536",
    quality: "low",
    n: 1
  });
  const b64 = data.data?.[0]?.b64_json;
  if (b64) {
    writeFileSync(outputPath, Buffer.from(b64, "base64"));
    return;
  }

  const url = data.data?.[0]?.url;
  if (url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Image download failed: ${response.status}`);
    writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()));
    return;
  }

  throw new Error("Image generation did not return image data.");
}

function buildImagePrompt(plan, segment) {
  return [
    "Vertical 9:16 YouTube Shorts frame, historically inspired mystery-crime documentary style.",
    "Respectful, non-graphic, no gore, no identifiable modern private people.",
    `Case: ${plan.case.title}. Section: ${segment.label}.`,
    `Visual direction: ${segment.visual}`,
    "Cinematic lighting, strong composition, room for captions at bottom."
  ].join(" ");
}

async function createClip(imagePath, audioPath, outputPath, caption, section = 1) {
  const safeCaption = sanitizeCaption(caption);
  const filter = [
    "scale=1080:1920:force_original_aspect_ratio=increase",
    "crop=1080:1920",
    "zoompan=z='min(zoom+0.0015,1.08)':d=150:s=1080x1920:fps=25",
    "drawtext=text='AI NARRATION':fontcolor=white@0.75:fontsize=24:box=1:boxcolor=black@0.42:boxborderw=10:x=w-text_w-32:y=32",
    `drawtext=text='${safeCaption}':fontcolor=white:fontsize=54:box=1:boxcolor=black@0.58:boxborderw=18:x=(w-text_w)/2:y=h-330`
  ].join(",");

  await run(FFMPEG, [
    "-y",
    "-loop",
    "1",
    "-i",
    imagePath,
    "-i",
    audioPath,
    "-f",
    "lavfi",
    "-i",
    buildSuspenseTrack(section),
    "-t",
    "6",
    "-vf",
    filter,
    "-filter_complex",
    "[1:a]apad=pad_dur=6,volume=1.0[voice];[2:a]volume=0.16,afade=t=in:st=0:d=0.35,afade=t=out:st=5.3:d=0.7[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=0,alimiter=limit=0.95[aout]",
    "-map",
    "0:v:0",
    "-map",
    "[aout]",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    outputPath
  ]);
}

function buildSuspenseTrack(section) {
  const pulse = 46 + (Number(section) % 4) * 2;
  const drone = 72 + (Number(section) % 3) * 3;
  return [
    `aevalsrc=0.5*sin(2*PI*${drone}*t)+0.22*sin(2*PI*${drone * 2}*t)+0.14*sin(2*PI*${pulse}*t)*(0.5+0.5*sin(2*PI*1.2*t))`,
    "s=44100",
    "d=6"
  ].join(":");
}

function sanitizeCaption(text) {
  return String(text || "")
    .replace(/[\\']/g, "")
    .replace(/:/g, " ")
    .slice(0, 58);
}

async function openAiJson(path, payload) {
  const response = await fetch(`https://api.openai.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text);
  return JSON.parse(text);
}

function extractResponseText(data) {
  if (data.output_text) return data.output_text;
  const item = data.output?.flatMap((entry) => entry.content || []).find((content) => content.text);
  if (item?.text) return item.text;
  throw new Error("No text returned from research response.");
}

function resolveFfmpeg() {
  const localPath = join(ROOT, "tools", "ffmpeg", "bin", "ffmpeg.exe");
  if (existsSync(localPath)) return localPath;
  const result = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  return result.status === 0 ? "ffmpeg" : null;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed: ${stderr.slice(-1200)}`));
    });
  });
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50);
}
