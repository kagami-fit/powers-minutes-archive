import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDiagramPrompt, buildMinutes } from "../server/minutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const RECORDS_FILE = path.join(PUBLIC_DIR, "records.json");

const args = parseArgs(process.argv.slice(2));

if (!args.title || !args.date) {
  console.error("Usage: npm run add-record -- --title <title> --date YYYY-MM-DD [--participants A,B] [--transcript file.txt] [--diagram image.png] [--notes text]");
  process.exit(1);
}

const transcriptText = args.transcript ? await fs.readFile(path.resolve(args.transcript), "utf8") : "";
const id = args.id || createId(args.date, args.title);
const recordDir = path.join(PUBLIC_DIR, "records", id);
await fs.mkdir(recordDir, { recursive: true });

let diagramUrl = "";
if (args.diagram) {
  const source = path.resolve(args.diagram);
  const ext = path.extname(source) || ".png";
  const target = path.join(recordDir, `diagram${ext}`);
  await fs.copyFile(source, target);
  diagramUrl = `records/${id}/diagram${ext}`;
}

let transcriptUrl = "";
if (transcriptText) {
  const transcriptPath = path.join(recordDir, "transcript.txt");
  await fs.writeFile(transcriptPath, transcriptText, "utf8");
  transcriptUrl = `records/${id}/transcript.txt`;
}

const baseRecord = {
  id,
  title: args.title,
  meetingDate: args.date,
  participants: splitList(args.participants),
  category: args.category || "議事録",
  location: args.location || "",
  notes: args.notes || "",
  transcriptText,
  transcriptUrl,
  diagramUrl,
  diagramCaption: args.diagramCaption || "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const record = {
  ...baseRecord,
  minutes: buildMinutes(baseRecord),
};
record.diagramPrompt = buildDiagramPrompt(record);

const records = await readRecords();
const index = records.findIndex((item) => item.id === record.id);
if (index >= 0) records[index] = record;
else records.push(record);

await fs.writeFile(RECORDS_FILE, `${JSON.stringify(records, null, 2)}\n`, "utf8");
console.log(`Added record: ${record.title} (${record.id})`);

async function readRecords() {
  try {
    return JSON.parse(await fs.readFile(RECORDS_FILE, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) continue;
    parsed[key.slice(2)] = argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[++index] : "true";
  }
  return parsed;
}

function splitList(value = "") {
  return String(value)
    .split(/[,\n、・]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function createId(date, title) {
  const slug = String(title)
    .normalize("NFKC")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
    .toLowerCase();
  return `${date}-${slug || "minutes"}`;
}
