import { Player } from "./Player.js";

(async () => {
  try {
    const testPlayer = new Player("fatninja001", "na1");
    await testPlayer.populateId();
    console.log(testPlayer.id)
  } catch (err) {
    console.error("💥 Script failed:", err);
  }
})();
