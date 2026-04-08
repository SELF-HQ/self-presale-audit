const hre = require("hardhat");

async function main() {
  const PRESALE_ADDRESS = process.env.PRESALE_ADDRESS;
  
  if (!PRESALE_ADDRESS) {
    throw new Error("PRESALE_ADDRESS environment variable not set");
  }
  
  console.log("Initializing 5 presale rounds...");
  console.log("Presale Address:", PRESALE_ADDRESS);
  
  const presale = await hre.ethers.getContractAt("SELFPresale", PRESALE_ADDRESS);
  
  // Round dates (Unix timestamps) — UPDATE BEFORE CALLING
  // V1.6 scheduling: Round 1 startTime is the presale launch date.
  // Subsequent rounds go live immediately when advanced to (no per-round startTime enforcement).
  // endTimes are safety backstops only. Set generous deadlines.
  //
  // ⚠️ ALL timestamps must be in the future at call time.
  // Generate timestamps: Math.floor(new Date("2026-05-01T00:00:00Z").getTime() / 1000)
  const startTimes = [
    0, // Round 1: UPDATE — presale launch date
    0, // Round 2: UPDATE — set after Round 1 start (safety endTime)
    0, // Round 3: UPDATE
    0, // Round 4: UPDATE
    0  // Round 5: UPDATE
  ];
  
  const endTimes = [
    0, // Round 1 ends: UPDATE — generous safety backstop
    0, // Round 2 ends: UPDATE
    0, // Round 3 ends: UPDATE
    0, // Round 4 ends: UPDATE
    0  // Round 5 ends: UPDATE — final presale deadline
  ];

  if (startTimes.some(t => t === 0) || endTimes.some(t => t === 0)) {
    throw new Error("Update all timestamps in startTimes[] and endTimes[] before running!");
  }
  
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
  console.log("Presale is ready. Round 1 goes live at the configured startTime.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

