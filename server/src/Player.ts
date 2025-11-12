/**
 * Represents a League of Legends account
 */

import { PlayerService } from "./PlayerService.js";

export class Player {
  gameName = "";
  tagLine = "";
  id = "";
  matches = [];

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
}
