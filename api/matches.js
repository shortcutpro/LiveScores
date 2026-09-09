// api/matches.js — proxy football-data.org dengan cache kuat + ETag
// /api/matches?date=YYYY-MM-DD | /api/matches?scope=live
// Token dari environment variable FD_TOKEN.

import crypto from "crypto";

export default async function handler(req, res) {
  const TOKEN = process.env.FD_TOKEN;
  if (!TOKEN) { res.status(500).json({ error: "FD_TOKEN belum diatur di Vercel." }); return; }

  let url;
  if (req.query.scope === "live") {
    url = "https://api.football-data.org/v4/matches?status=LIVE";
  } else {
    let date = req.query.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) date = new Date().toISOString().slice(0, 10);
    url = `https://api.football-data.org/v4/matches?dateFrom=${date}&dateTo=${date}`;
  }

  try {
    const r = await fetch(url, { headers: { "X-Auth-Token": TOKEN } });
    const text = await r.text();

    // ETag agar browser bisa balas 304 (hemat bandwidth), seperti plugin WP
    const etag = '"' + crypto.createHash("md5").update(text).digest("hex") + '"';
    const inm = req.headers["if-none-match"];

    res.setHeader("ETag", etag);
    // fresh 20s di edge, sajikan stale s/d 60s sambil revalidate → tahan trafik tinggi
    res.setHeader("Cache-Control", "public, max-age=10, s-maxage=20, stale-while-revalidate=60");
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    if (inm && inm === etag) { res.status(304).end(); return; }
    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).json({ error: "Gagal menghubungi football-data.org", detail: String(e) });
  }
}
