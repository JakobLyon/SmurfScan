/**
 * Represents a League of Legends account
 */

import { PlayerService } from "./PlayerService.js";

export class Player {
  gameName = "";
  tagLine = "";
  id = "";
  matches = [] as any[];

  constructor(gameName: string, tagLine: string) {
    this.gameName = gameName;
    this.tagLine = tagLine;
  }

  /**
   * Hydrate account id based on gameName, tagLine, and region
   */
  async populateId() {
    if (this.gameName === "") {
      throw new Error("gameName missing");
    }
    if (this.tagLine === "") {
      throw new Error("tagLine missing");
    }
    const account = await PlayerService.getAccountByRiotId(
      this.gameName,
      this.tagLine,
      "americas"
    );
    this.id = account.puuid;
  }

  /**
   * Hydrate recent ranked matches
   */
  async populateMatchData() {
    if (this.id === "") {
      throw new Error("id missing");
    }
    const res = await PlayerService.getRankedData("na1", this.id);
    this.matches = res.matches;
  }
}
