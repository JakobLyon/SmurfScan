/**
 * @file Player tests
 */
import { describe, beforeEach, it, expect, jest } from "@jest/globals";
import { Player } from "../src/Player.js";
import { PlayerService } from "../src/PlayerService.js";

describe("Player", () => {
  let player: Player;

  beforeEach(() => {
    player = new Player("Summoner", "NA1");
  });

  it("throws if gameName is missing", async () => {
    const player = new Player("", "NA1");
    await expect(player.populateId()).rejects.toThrow("gameName missing");
  });

  it("throws if tagLine is missing", async () => {
    const player = new Player("Summoner", "");
    await expect(player.populateId()).rejects.toThrow("tagLine missing");
  });

  it("calls PlayerService.getAccountByRiotId and sets id", async () => {
    // Mock the service method
    jest
      .spyOn(PlayerService, "getAccountByRiotId")
      .mockResolvedValue({ puuid: "fake-uuid" });

    await player.populateId();

    expect(PlayerService.getAccountByRiotId).toHaveBeenCalledWith(
      "Summoner",
      "NA1",
      "americas"
    );
    expect(player.id).toBe("fake-uuid");
  });
});
