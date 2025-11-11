import { Player } from "./Player.js";

(async () => {
  try {
    const testPlayer = new Player("fatninja001", "na1");
    await testPlayer.populateId();
    console.assert(
      testPlayer.id ===
        "w8UHUfzREwUDaFT2SVDzvO49NDZwBwvnAAvH8vAojRRHXQGmcxQqwqxSI71uw_ODhZ3k0CHwnbshxQ"
    );
  } catch (err) {
    console.error("💥 Script failed:", err);
  }
})();
