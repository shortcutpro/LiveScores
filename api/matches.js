// api/matches.js — serverless proxy untuk football-data.org
// Dipanggil sebagai /api/matches?scope=today  atau  ?scope=live
// Token dibaca dari environment variable FD_TOKEN (diatur di dashboard Vercel).

export default async function handler(req, res) {
  const TOKEN = process.env.FD_TOKEN;

  if (!TOKEN) {
    res.status(500).json({ error: "FD_TOKEN belum diatur di Environment Variables Vercel." });
    return;
  }

  const scope = req.query.scope === "live" ? "live" : "today";
  let url;
  if (scope === "live") {
    url = "https://api.football-data.org/v4/matches?status=LIVE";
  } else {
    const today = new Date().toISOString().slice(0, 10);
    url = `https://api.football-data.org/v4/matches?dateFrom=${today}&dateTo=${today}`;
  }

  try {
    const r = await fetch(url, { headers: { "X-Auth-Token": TOKEN } });
    const body = await r.text();
    // cache ringan agar tidak boros kuota (10 req/menit di tier gratis)
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=30");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(r.status).send(body);
  } catch (e) {
    res.status(502).json({ error: "Gagal menghubungi football-data.org", detail: String(e) });
  }
}
