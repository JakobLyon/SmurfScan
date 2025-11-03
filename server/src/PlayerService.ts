/**
 * A service that contacts Riot Games APIs to get player and match data
 */

import "dotenv/config";
import fetch from "node-fetch";

interface AccountResponse {
  puuid: string;
}

export class PlayerService {
  /**
   * Helper function to make network request
   *
   * @param url api endpoint to reach
   * @returns   response from api
   */
  private static async apiFetch(url: string) {
    if (!url) {
      throw new Error("Missing url");
    }

    if (!process.env.RIOT_API_KEY) {
      throw new Error("Missing RIOT_API_KEY");
    }

    const res = await fetch(url, {
      headers: { "X-Riot-Token": process.env.RIOT_API_KEY },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `${res.status} ${res.statusText} for ${url}. Response: ${text}`
      );
    }

    return res;
  }

  /**
   *
   * @param gameName account name
   * @param tagLine  account tag line
   * @param region   account region
   * @returns        puuid
   */
  static async getAccountByRiotId(
    gameName: string,
    tagLine: string,
    region: string
  ): Promise<{ puuid: string }> {
    if (!gameName || !tagLine) {
      throw new Error("Invalid Riot ID. Must be GameName#TagLine");
    }
    const url = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      gameName
    )}/${encodeURIComponent(tagLine)}`;
    const res = await this.apiFetch(url);
    if (!res.ok) throw new Error(`Failed to fetch account: ${res.status}`);
    return (await res.json()) as AccountResponse;
  }
}
