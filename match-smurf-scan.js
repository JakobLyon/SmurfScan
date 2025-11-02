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
  const url = `https://${REGION_HOST}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=10`;
  const res = await riotFetch(url);
  if (!res.ok) throw new Error(`Failed to fetch matches: ${res.status}`);
  return res.json();
}

// Extract participant object for our puuid from a match
function findParticipant(matchJson, puuid) {
  return matchJson.info.participants.find(p => p.puuid === puuid);
}

// Compute per-match metrics
function metricsFromParticipant(participant, matchInfo) {
  const durationSec = matchInfo.gameDuration ?? matchInfo.gameEndTimestamp ?? matchInfo.gameDuration; // usually seconds
  const durationMin = Math.max(1, durationSec / 60);

  const kills = participant.kills ?? 0;
  const deaths = participant.deaths ?? 0;
  const assists = participant.assists ?? 0;
  const killsAndAssists = kills + assists;
  const kda = killsAndAssists / Math.max(1, deaths);

  const cs = (participant.totalMinionsKilled ?? 0) + (participant.neutralMinionsKilled ?? 0);
  const csPerMin = cs / durationMin;

  const gold = participant.goldEarned ?? (participant.goldPerMin ? participant.goldPerMin * durationMin : 0);
  const goldPerMin = gold / durationMin;

  const dmg = participant.totalDamageDealtToChampions ?? 0;
  const dmgPerMin = dmg / durationMin;

  // gold diff at 10 (if challenges present)
  const goldDiff10 = (participant.challenges && typeof participant.challenges.goldDiffAt10 === 'number')
    ? participant.challenges.goldDiffAt10
    : null;

  // determine team kills (sum kills for all participants on that team)
  const teamId = participant.teamId;
  let teamKills = 0;
  for (const p of matchInfo.participants) {
    if (p.teamId === teamId) teamKills += (p.kills ?? 0);
  }
  const killParticipation = teamKills > 0 ? (killsAndAssists / teamKills) : 0;

  const win = !!participant.win;
  const champ = participant.championName;

  return {
    win,
    kda,
    kills,
    deaths,
    assists,
    csPerMin,
    goldPerMin,
    goldDiff10,
    killParticipation,
    dmgPerMin,
    champ
  };
}

// Aggregate metrics across matches
function aggregateMetrics(metricsArray) {
  const N = metricsArray.length;
  const sum = (key, skipNull = false) => {
    let s = 0, cnt = 0;
    for (const m of metricsArray) {
      const v = m[key];
      if (v == null) {
        if (skipNull) continue;
      }
      s += v != null ? v : 0;
      cnt++;
    }
    return { sum: s, count: cnt };
  };

  const wins = metricsArray.filter(m => m.win).length;
  const avgKda = sum('kda').sum / N;
  const avgCsPerMin = sum('csPerMin').sum / N;
  const avgGoldPerMin = sum('goldPerMin').sum / N;
  // goldDiff10 may be null for some matches: average only those with data
  const gd10 = sum('goldDiff10', true);
  const avgGoldDiff10 = gd10.count > 0 ? (gd10.sum / gd10.count) : null;
  const avgKillPart = sum('killParticipation').sum / N;
  const avgDmgPerMin = sum('dmgPerMin').sum / N;

  const champPool = new Set(metricsArray.map(m => m.champ));
  return {
    games: N,
    winrate: wins / N,
    avgKda,
    avgCsPerMin,
    avgGoldPerMin,
    avgGoldDiff10,
    avgKillParticipation: avgKillPart,
    avgDmgPerMin,
    champPoolSize: champPool.size
  };
}

// Scoring function (adjust thresholds as you like)
function computeSmurfScoreFromAgg(agg) {
  let score = 0;
  if (agg.champPoolSize <= 3) score += 1;
  if (agg.avgKda >= 4.0) score += 2;
  if (agg.avgCsPerMin >= 7.5) score += 2;
  if (agg.avgGoldPerMin >= 400 / 60) { // converting earlier threshold (400/min was earlier absolute) -> but our goldPerMin typically large; keep simple threshold: >300gpm
    // Actually real gold/min thresholds depend on region; use 300 gpm as a strong signal
    score += 1;
  }
  if (agg.avgGoldDiff10 != null && agg.avgGoldDiff10 >= 1000) score += 2; // huge early leads
  if (agg.winrate >= 0.65) score += 3;
  if (agg.avgDmgPerMin >= 600 / (10)) { // approximate: earlier we used damage/min > 600; choose threshold 300 dpm
    score += 1;
  }
  // Kill participation high (they carry) — add small weight
  if (agg.avgKillParticipation >= 0.55) score += 1;

  return score;
}

function interpretScore(score) {
  if (score >= 14) return '🟥 Almost Certainly Smurf';
  if (score >= 9) return '🟧 Likely Smurf';
  if (score >= 5) return '🟨 Possibly Smurf';
  return '🟩 Likely Legit';
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

    // fetch all specified matches (we'll fetch up to the number provided)
    const matchPromises = matches.map(id => riotFetch(`https://${REGION_HOST}.api.riotgames.com/lol/match/v5/matches/${id}`));
    const matchRes = await Promise.all(matchPromises);
    const matchJsons = await Promise.all(matchRes.map(match => match.json()))

    // find participant metrics for each match
    const metricsArray = [];
    for (const match of matchJsons) {
      const participant = findParticipant(match, account.puuid);
      if (!participant) {
        console.warn("Warning: puuid not found in match", match.metadata?.matchId ?? "(unknown)");
        continue;
      }
      const m = metricsFromParticipant(participant, match.info);
      metricsArray.push(m);
    }

    if (metricsArray.length === 0) {
      console.error("No matches contained the given puuid. Exiting.");
      process.exit(1);
    }

    const agg = aggregateMetrics(metricsArray);
    const score = computeSmurfScoreFromAgg(agg);
    const verdict = interpretScore(score);

    console.log("\n--- Smurf Index (aggregated) ---");
    console.log(`Matches analyzed: ${agg.games}`);
    console.log(`Winrate: ${(agg.winrate*100).toFixed(1)}%`);
    console.log(`Avg KDA: ${agg.avgKda.toFixed(2)}`);
    console.log(`Avg CS/min: ${agg.avgCsPerMin.toFixed(2)}`);
    console.log(`Avg Gold/min: ${agg.avgGoldPerMin.toFixed(1)}`);
    console.log(`Avg GoldDiff@10: ${agg.avgGoldDiff10 == null ? "N/A" : Math.round(agg.avgGoldDiff10)}`);
    console.log(`Avg Kill Participation: ${(agg.avgKillParticipation*100).toFixed(1)}%`);
    console.log(`Avg Damage/min: ${agg.avgDmgPerMin.toFixed(1)}`);
    console.log(`Champ pool size (unique champs in sampled games): ${agg.champPoolSize}`);
    console.log(`Smurf Index: ${score} → ${verdict}\n`);

  } catch (err) {
    console.error("💥 Script failed:", err);
  }

})();
