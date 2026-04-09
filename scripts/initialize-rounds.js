const hre = require("hardhat");

async function main() {
  const PRESALE_ADDRESS = process.env.PRESALE_ADDRESS;
  
  if (!PRESALE_ADDRESS) {
    throw new Error("PRESALE_ADDRESS environment variable not set");
  }
  
  console.log("Initializing 5 presale rounds...");
  console.log("Presale Address:", PRESALE_ADDRESS);
  
  const presale = await hre.ethers.getContractAt("SELFPresale", PRESALE_ADDRESS);
  
  // V1.6 scheduling: Round 1 startTime is the presale launch date.
  // Subsequent rounds go live immediately when advanced to (no per-round startTime enforcement).
  // endTimes are 3-month safety backstops. ROUND_MANAGER controls transitions manually.
  const startTimes = [
    Math.floor(new Date("2026-05-01T00:00:00Z").getTime() / 1000), // Round 1: presale launch
    Math.floor(new Date("2026-05-02T00:00:00Z").getTime() / 1000), // Rounds 2-5: sequential for validation only
    Math.floor(new Date("2026-05-03T00:00:00Z").getTime() / 1000),
    Math.floor(new Date("2026-05-04T00:00:00Z").getTime() / 1000),
    Math.floor(new Date("2026-05-05T00:00:00Z").getTime() / 1000),
  ];

  const endTimes = [
    Math.floor(new Date("2026-08-01T00:00:00Z").getTime() / 1000), // Round 1 backstop: Aug 1
    Math.floor(new Date("2026-11-01T00:00:00Z").getTime() / 1000), // Round 2 backstop: Nov 1
    Math.floor(new Date("2027-02-01T00:00:00Z").getTime() / 1000), // Round 3 backstop: Feb 1
    Math.floor(new Date("2027-05-01T00:00:00Z").getTime() / 1000), // Round 4 backstop: May 1
    Math.floor(new Date("2027-08-01T00:00:00Z").getTime() / 1000), // Round 5 backstop: Aug 1
  ];
  
  console.log("\nRound Schedule (V1.6 — 40% TGE all rounds, no bonuses):");
  console.log("Round 1: 6¢ | $1.5M target | 40% TGE | 0% bonus");
  console.log("Round 2: 7¢ | $500k target | 40% TGE | 0% bonus");
  console.log("Round 3: 8¢ | $250k target | 40% TGE | 0% bonus");
  console.log("Round 4: 9¢ | $150k target | 40% TGE | 0% bonus");
  console.log("Round 5: 10¢ | $100k target | 40% TGE | 0% bonus");
  
  console.log("\nInitializing rounds...");
  const tx = await presale.initializeRounds(startTimes, endTimes);
  console.log("Transaction hash:", tx.hash);
  
  await tx.wait();
  console.log("✅ Rounds initialized successfully!");
  
  // Verify initialization
  console.log("\nVerifying round 1 configuration...");
  const round1 = await presale.rounds(0);
  console.log("Price:", hre.ethers.formatUnits(round1.price, 6), "USDC per SELF ($0.06)");
  console.log("Target:", hre.ethers.formatUnits(round1.target, 6), "USDC");
  console.log("TGE Unlock:", round1.tgeUnlock.toString(), "%");
  console.log("Bonus:", round1.bonus.toString(), "%");
  
  console.log("\n=== Initialization Complete ===");
  console.log("Round 1 goes live: May 1, 2026 00:00 UTC");
  console.log("Rounds 2-5 go live instantly when advanced to (ROUND_MANAGER controls transitions).");
  console.log("End times are 3-month safety backstops per round (Aug 2026 → Aug 2027).");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

