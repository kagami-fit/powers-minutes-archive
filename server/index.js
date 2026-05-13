import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const RECORDS_FILE = path.join(PUBLIC_DIR, "records.json");
const PORT = Number(process.env.PORT || 3000);

const app = express();

app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    mode: "viewer",
    recordsFile: RECORDS_FILE,
  });
});

app.get("/api/records", async (_req, res, next) => {
  try {
    res.json(await readRecords());
  } catch (error) {
    next(error);
  }
});

app.get("/api/records/:id", async (req, res, next) => {
  try {
    const records = await readRecords();
    const record = records.find((item) => item.id === req.params.id);
    if (!record) return res.status(404).json({ error: "record_not_found" });
    res.json(record);
  } catch (error) {
    next(error);
  }
});

app.use((_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "internal_error", message: error.message });
});

app.listen(PORT, () => {
  console.log(`Powers Minutes Archive: http://localhost:${PORT}`);
});

async function readRecords() {
  try {
    const json = await fs.readFile(RECORDS_FILE, "utf8");
    return JSON.parse(json);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
