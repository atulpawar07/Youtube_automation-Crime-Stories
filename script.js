const cases = [
  {
    id: "whitechapel",
    title: "Jack the Ripper",
    year: "1888",
    location: "Whitechapel, London",
    mystery: "a killer vanished behind letters, fog, and police confusion",
    clue: "the letters may have been a distraction",
    twist: "the most famous suspect list may be the least reliable evidence",
    caution: "Avoid naming one person as the killer; the case is unsolved."
  },
  {
    id: "dahlia",
    title: "The Black Dahlia",
    year: "1947",
    location: "Los Angeles",
    mystery: "a staged crime scene became one of Hollywood's darkest cold cases",
    clue: "the body placement looked deliberate, almost theatrical",
    twist: "the media frenzy may have buried the cleanest leads",
    caution: "Keep details respectful and non-graphic."
  },
  {
    id: "villlisca",
    title: "Villisca Axe Murders",
    year: "1912",
    location: "Villisca, Iowa",
    mystery: "an entire house was attacked while the town slept",
    clue: "covered mirrors and untouched valuables pointed away from robbery",
    twist: "too many suspects made the truth harder to see",
    caution: "Mention victims respectfully; avoid sensational gore."
  },
  {
    id: "somerton",
    title: "Somerton Man",
    year: "1948",
    location: "Adelaide, Australia",
    mystery: "a dead stranger carried no identity, only a torn phrase from a book",
    clue: "the words Tamam Shud pointed investigators toward a rare copy",
    twist: "the code in the book still feels like a door left half open",
    caution: "Present newer identification claims carefully as claims."
  },
  {
    id: "lindbergh",
    title: "Lindbergh Kidnapping",
    year: "1932",
    location: "New Jersey",
    mystery: "a ladder, ransom notes, and a celebrity trial left lasting doubts",
    clue: "wood grain evidence tied the ladder to the accused",
    twist: "the conviction did not end debate over the investigation",
    caution: "Do not overstate conspiracy claims."
  }
];

const beats = [
  {
    label: "Hook",
    title: "Open the locked door",
    audio: "Low hit, quick silence",
    makeVoiceover: (c, h) => `${h || "This case has one clue that refuses to die"}: ${c.title} began in ${c.year}, and the mystery still feels unfinished.`
  },
  {
    label: "Setup",
    title: "Place and time",
    audio: "Slow ticking clock",
    makeVoiceover: (c) => `In ${c.location}, fear spread fast because this was not just a crime. It was a story nobody could control.`
  },
  {
    label: "Crime",
    title: "What happened",
    audio: "Deep pulse",
    makeVoiceover: (c) => `The known facts were chilling: ${c.mystery}. Every answer seemed to create another question.`
  },
  {
    label: "Clue",
    title: "The detail",
    audio: "Camera shutter",
    makeVoiceover: (c) => `Then came the detail investigators could not ignore: ${c.clue}.`
  },
  {
    label: "Suspects",
    title: "The names",
    audio: "Paper shuffle",
    makeVoiceover: () => `Witnesses, rumors, and theories multiplied. Some suspects looked convincing for a day, then fell apart by morning.`
  },
  {
    label: "Mistake",
    title: "The investigation bends",
    audio: "Muffled crowd",
    makeVoiceover: () => `Pressure changed everything. Police chased leads, newspapers chased headlines, and the public chased certainty.`
  },
  {
    label: "Twist",
    title: "The strange turn",
    audio: "Reverse swell",
    makeVoiceover: (c) => `The strangest part is this: ${c.twist}.`
  },
  {
    label: "Theory",
    title: "The best theory",
    audio: "Soft bass rise",
    makeVoiceover: () => `The strongest theory is not always the loudest one. It is the one that explains the clues without inventing new ones.`
  },
  {
    label: "Mystery",
    title: "Why it survives",
    audio: "Thin drone",
    makeVoiceover: () => `That is why this case survives. It sits between evidence and imagination, close enough to touch, too far to solve.`
  },
  {
    label: "Close",
    title: "Final sting",
    audio: "Hard stop",
    makeVoiceover: (c) => `So the question is not only who did it. It is whether the missing truth was hidden, lost, or ignored.`
  }
];

const visuals = {
  noir: [
    "High-contrast animated street, drifting fog, evidence photos sliding into frame",
    "Sepia map zoom with a red route line and pulsing location marker",
    "Shadowed doorway, rain on glass, newspaper headline wipe",
    "Macro shot of the clue on a dark table, slow push-in",
    "Evidence board with string lines appearing one by one",
    "Police desk animation, files stacking while camera shakes slightly",
    "Single clue rotates under a desk lamp, background falls to black",
    "Three suspect silhouettes, one fades, then another",
    "Empty street loop with captions timed to breath pauses",
    "Black screen snap to final question over one stark object"
  ],
  archive: [
    "Old paper texture, archival photo collage, fast headline cuts",
    "Historic map, date stamp, typed location label",
    "Recreated newspaper front page with slow zoom",
    "Evidence close-up with magnifier pass",
    "Suspect names typed onto index cards",
    "Crowd and press montage with flashbulb transitions",
    "Timeline rewinds, one clue remains pinned",
    "Theory cards ranked by evidence strength",
    "Archive boxes closing, one file left open",
    "Final headline tears away to reveal the question"
  ],
  map: [
    "Top-down case board with map, photos, pins, and a red timer",
    "Map marker drops onto the city, route line sketches itself",
    "Crime scene diagram drawn as clean animation",
    "Clue card slides in beside the map",
    "Suspect cards orbit the central location",
    "Investigation timeline branches into dead ends",
    "Map zooms to one unexplained detail",
    "Theory path lights up in green, weak paths fade",
    "Board lights dim except unsolved evidence",
    "Final zoom out from board to title card"
  ]
};

const caseSelect = document.querySelector("#caseSelect");
const form = document.querySelector("#generatorForm");
const timeline = document.querySelector("#timeline");
const projectTitle = document.querySelector("#projectTitle");
const template = document.querySelector("#segmentTemplate");
const serverStatus = document.querySelector("#serverStatus");
const automationLog = document.querySelector("#automationLog");
const researchButton = document.querySelector("#researchButton");
const renderButton = document.querySelector("#renderButton");
let currentPlan = null;
let serverOnline = false;

function populateCases() {
  cases.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.title} (${item.year})`;
    caseSelect.appendChild(option);
  });
}

function getSelectedCase(customCase) {
  if (customCase.trim()) {
    return {
      id: "custom",
      title: customCase.trim(),
      year: "history",
      location: "the historical record",
      mystery: "the case became famous because the official story never fully closed",
      clue: "one small detail kept pulling investigators back",
      twist: "the mystery survived because the evidence can be read in more than one way",
      caution: "Research the facts before publishing."
    };
  }

  return cases.find((item) => item.id === caseSelect.value) || cases[0];
}

function buildCaption(text) {
  const words = text.replace(/[.,:;]/g, "").split(" ");
  return words.slice(0, 8).join(" ").toUpperCase();
}

function buildPlan(data) {
  const selectedCase = getSelectedCase(data.get("customCase") || "");
  const style = data.get("styleSelect") || "noir";
  const hook = data.get("hookInput") || "";
  const tone = data.get("toneSelect") || "cold";

  const tonePrefix = {
    cold: "calm, ominous, controlled",
    urgent: "fast, tense, breathless",
    documentary: "clear, restrained, investigative"
  }[tone];

  const segments = beats.map((beat, index) => {
    const start = index * 6;
    const end = start + 6;
    const voiceover = beat.makeVoiceover(selectedCase, hook);
    return {
      section: index + 1,
      time: `${start}s-${end}s`,
      label: beat.label,
      title: beat.title,
      voiceover,
      visual: `${visuals[style][index]}. Style: ${tonePrefix}.`,
      caption: buildCaption(voiceover),
      audio: beat.audio
    };
  });

  return {
    title: `${selectedCase.title}: 60-second mystery short`,
    case: selectedCase,
    durationSeconds: 60,
    sections: 10,
    secondsPerSection: 6,
    style,
    tone,
    segments
  };
}

function setBusy(button, busy, text) {
  button.disabled = busy;
  button.textContent = busy ? text : button.dataset.label;
}

function addLog(title, message, links = []) {
  const item = document.createElement("div");
  item.className = "log-item";
  const linkMarkup = links.length
    ? `<div class="asset-links">${links.map((link) => `<a href="${link.href}" target="_blank" rel="noreferrer">${link.label}</a>`).join("")}</div>`
    : "";
  item.innerHTML = `<strong>${title}</strong><span>${message}</span>${linkMarkup}`;
  automationLog.prepend(item);
}

function renderPlan(plan) {
  projectTitle.textContent = plan.title;
  timeline.innerHTML = "";

  plan.segments.forEach((segment) => {
    const node = template.content.cloneNode(true);
    node.querySelector(".timecode").textContent = segment.time;
    node.querySelector("h3").textContent = `${segment.section}. ${segment.title}`;
    node.querySelector(".segment-head span").textContent = segment.label;
    node.querySelector(".voiceover").textContent = segment.voiceover;
    node.querySelector(".visual").textContent = segment.visual;
    node.querySelector(".caption").textContent = segment.caption;
    node.querySelector(".audio").textContent = segment.audio;
    const factBox = node.querySelector(".fact-box");
    if (segment.factCheck) {
      factBox.classList.add("is-visible");
      factBox.innerHTML = [
        `<p><b>Fact check</b> ${segment.factCheck.status}</p>`,
        `<p>${segment.factCheck.note}</p>`
      ].join("");
    }
    timeline.appendChild(node);
  });
}

function toMarkdown(plan) {
  const rows = plan.segments.map((segment) => {
    return [
      `## ${segment.section}. ${segment.time} - ${segment.label}`,
      `Title: ${segment.title}`,
      `Voiceover: ${segment.voiceover}`,
      `Visual: ${segment.visual}`,
      `Caption: ${segment.caption}`,
      `Audio: ${segment.audio}`
    ].join("\n");
  });

  return [
    `# ${plan.title}`,
    `Case note: ${plan.case.caution}`,
    `Duration: ${plan.durationSeconds}s`,
    "",
    rows.join("\n\n")
  ].join("\n");
}

function toCsv(plan) {
  const header = ["section", "time", "label", "title", "voiceover", "visual", "caption", "audio"];
  const rows = plan.segments.map((segment) => header.map((key) => csvCell(segment[key])).join(","));
  return [header.join(","), ...rows].join("\n");
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function flashButton(button, label) {
  const original = button.textContent;
  button.textContent = label;
  setTimeout(() => {
    button.textContent = original;
  }, 1200);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  currentPlan = buildPlan(new FormData(form));
  renderPlan(currentPlan);
});

document.querySelector("#copyMarkdown").addEventListener("click", async () => {
  if (!currentPlan) return;
  await copyText(toMarkdown(currentPlan));
  flashButton(document.querySelector("#copyMarkdown"), "Copied");
});

document.querySelector("#downloadJson").addEventListener("click", () => {
  if (!currentPlan) return;
  downloadFile("crime-short-plan.json", JSON.stringify(currentPlan, null, 2), "application/json");
});

document.querySelector("#downloadCsv").addEventListener("click", () => {
  if (!currentPlan) return;
  downloadFile("crime-short-plan.csv", toCsv(currentPlan), "text/csv");
});

async function apiPost(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

async function checkServer() {
  try {
    const response = await fetch("/api/status");
    const status = await response.json();
    serverOnline = true;
    const apiState = status.hasOpenAiKey ? "OpenAI key found" : "add OPENAI_API_KEY to .env";
    const ffmpegState = status.hasFfmpeg ? "ffmpeg ready" : "install ffmpeg for MP4 assembly";
    serverStatus.textContent = `Server ready: ${apiState}; ${ffmpegState}.`;
    addLog("Server status", `${apiState}; ${ffmpegState}.`);
  } catch (error) {
    serverOnline = false;
    serverStatus.textContent = "Static mode: run npm start, then open http://localhost:4317 for full automation.";
  }
  researchButton.disabled = !serverOnline;
  renderButton.disabled = !serverOnline;
}

researchButton.dataset.label = researchButton.textContent;
renderButton.dataset.label = renderButton.textContent;

researchButton.addEventListener("click", async () => {
  if (!currentPlan) return;
  setBusy(researchButton, true, "Researching...");
  addLog("AI research started", "Checking the case, improving the script, and marking risky claims.");
  try {
    const result = await apiPost("/api/research", { plan: currentPlan });
    currentPlan = result.plan;
    renderPlan(currentPlan);
    addLog("Research complete", `${currentPlan.case.title} now includes fact-check notes and revised section scripts.`);
  } catch (error) {
    addLog("Research failed", error.message);
  } finally {
    setBusy(researchButton, false);
  }
});

renderButton.addEventListener("click", async () => {
  if (!currentPlan) return;
  setBusy(renderButton, true, "Creating...");
  addLog("Video job started", "Generating TTS audio, section images, clips, and the final vertical video.");
  try {
    const result = await apiPost("/api/render", { plan: currentPlan });
    const links = result.files.map((file) => ({ label: file.label, href: file.url }));
    addLog("Video job complete", result.message, links);
  } catch (error) {
    addLog("Video job failed", error.message);
  } finally {
    setBusy(renderButton, false);
  }
});

populateCases();
currentPlan = buildPlan(new FormData(form));
renderPlan(currentPlan);
checkServer();
