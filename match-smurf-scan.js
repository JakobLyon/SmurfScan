import 'dotenv/config';
import fetch from "node-fetch";

// 🌎 Riot regional host for account-v1 (choose based on player region)
const REGION_HOST = "americas"; // NA/LAN/LAS/BR -> "americas", EUW/EUNE/TR/RU -> "europe", KR/JP -> "asia"
// 🗺️ Platform host for summoner-specific data (optional)
const PLATFORM = "na1"; // for ranked endpoints

// 🧰 Centralized fetch with logging
async function riotFetch(url) {
  console.log("➡️ Fetching:", url);
  const res = await fetch(url, {
    headers: { "X-Riot-Token": process.env.RIOT_API_KEY },
  });
  if (!res.ok) {
    console.error(`❌ ${res.status} ${res.statusText} for ${url}`);
    const text = await res.text();
    console.error("Response:", text);
  }
  return res;
}

// 📇 Get account info from Riot ID (GameName#TagLine)
async function getAccountByRiotId(riotId) {
  const [gameName, tagLine] = riotId.split('#');
  if (!gameName || !tagLine) throw new Error("Invalid Riot ID. Must be GameName#TagLine");

  const url = `https://${REGION_HOST}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  const res = await riotFetch(url);
  if (!res.ok) throw new Error(`Failed to fetch account: ${res.status}`);
  return res.json();
}

// 📊 Get ranked data (platform endpoint)
async function getRankedData(puuid) {
  const url = `https://${PLATFORM}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
  const res = await riotFetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ranked data: ${res.status}`);
  return res.json();
}

// 📜 Get last 20 match IDs
async function getRecentMatches(puuid) {
  const url = `https://${REGION_HOST}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=20`;
  const res = await riotFetch(url);
  if (!res.ok) throw new Error(`Failed to fetch matches: ${res.status}`);
  return res.json();
}

// 🎯 Main execution
(async () => {
  try {
    const riotId = process.argv[2]; // expects GameName#TagLine
    if (!riotId) {
      console.error("Usage: node match-smurf-scan.js <GameName#TagLine>");
      process.exit(1);
    }

    console.log(`🔍 Looking up ${riotId}...`);

    // 1️⃣ Get account info (PUUID)
    const account = await getAccountByRiotId(riotId);
    console.log("✅ Account info:", account);

    // 3️⃣ Get ranked info
    const ranked = await getRankedData(account.puuid);
    console.log("🏆 Ranked data:", ranked);

    // 4️⃣ Get recent matches
    const matches = await getRecentMatches(account.puuid);
    console.log("🕹️ Recent matches:", matches.length);

  } catch (err) {
    console.error("💥 Script failed:", err);
  }
})();
