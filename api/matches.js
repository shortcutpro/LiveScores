// api/matches.js — serverless proxy untuk football-data.org
// /api/matches?date=YYYY-MM-DD   -> pertandingan tanggal itu
// /api/matches?scope=live        -> laga yang sedang berlangsung
// Token dibaca dari environment variable FD_TOKEN.

export default async function handler(req, res) {
  const TOKEN = process.env.FD_TOKEN;
  if (!TOKEN) {
    res.status(500).json({ error: "FD_TOKEN belum diatur di Environment Variables Vercel." });
    return;
  }

  let url;
  if (req.query.scope === "live") {
    url = "https://api.football-data.org/v4/matches?status=LIVE";
  } else {
    // validasi tanggal; default hari ini (UTC)
    let date = req.query.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
      date = new Date().toISOString().slice(0, 10);
    }
    url = `https://api.football-data.org/v4/matches?dateFrom=${date}&dateTo=${date}`;
  }

  try {
    const r = await fetch(url, { headers: { "X-Auth-Token": TOKEN } });
    const body = await r.text();
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=30");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(r.status).send(body);
  } catch (e) {
    res.status(502).json({ error: "Gagal menghubungi football-data.org", detail: String(e) });
  }
}
