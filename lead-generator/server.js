import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { generateLeads, leadsToCsv } from "./src/leads.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";
const DEFAULT_PROVIDER = process.env.DEFAULT_PROVIDER || "google";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Tell the frontend which providers are usable so the UI can adapt.
app.get("/api/config", (_req, res) => {
  res.json({
    googleEnabled: Boolean(API_KEY),
    defaultProvider: API_KEY ? DEFAULT_PROVIDER : "osm",
  });
});

function resolveProvider(requested) {
  const provider = requested || DEFAULT_PROVIDER;
  if (provider === "google" && !API_KEY) return "osm";
  return provider;
}

app.post("/api/leads", async (req, res) => {
  try {
    const { type, location, limit, provider, onlyNoWebsite } = req.body || {};
    const chosen = resolveProvider(provider);
    const leads = await generateLeads({
      type,
      location,
      limit,
      provider: chosen,
      apiKey: API_KEY,
      onlyNoWebsite: Boolean(onlyNoWebsite),
    });
    res.json({ provider: chosen, count: leads.length, leads });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post("/api/leads.csv", async (req, res) => {
  try {
    const { type, location, limit, provider, onlyNoWebsite } = req.body || {};
    const chosen = resolveProvider(provider);
    const leads = await generateLeads({
      type,
      location,
      limit,
      provider: chosen,
      apiKey: API_KEY,
      onlyNoWebsite: Boolean(onlyNoWebsite),
    });
    const csv = leadsToCsv(leads);
    const safe = `${type}-${location}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="leads-${safe}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Lead generator running at http://localhost:${PORT}`);
  console.log(`Google Places: ${API_KEY ? "enabled" : "disabled (using OpenStreetMap)"}`);
});
