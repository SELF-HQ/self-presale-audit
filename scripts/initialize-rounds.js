const hre = require("hardhat");

async function main() {
  const PRESALE_ADDRESS = process.env.PRESALE_ADDRESS;
  
  if (!PRESALE_ADDRESS) {
    throw new Error("PRESALE_ADDRESS environment variable not set");
  }
  
  console.log("Initializing 5 presale rounds...");
  console.log("Presale Address:", PRESALE_ADDRESS);
  
  const presale = await hre.ethers.getContractAt("SELFPresale", PRESALE_ADDRESS);
  
  // Round dates (Unix timestamps)
  // Feb 1, 2026 00:00 UTC to Mar 12, 2026 23:59 UTC
  const startTimes = [
    1738368000, // Round 1: Feb 1, 2026
    1739404800, // Round 2: Feb 13, 2026
    1740268800, // Round 3: Feb 23, 2026
    1741132800, // Round 4: Mar 3, 2026
    1741651200  // Round 5: Mar 9, 2026
  ];
  
  const endTimes = [
    1739404799, // Round 1 ends: Feb 12, 2026 23:59
    1740268799, // Round 2 ends: Feb 22, 2026 23:59
    1741132799, // Round 3 ends: Mar 2, 2026 23:59
    1741651199, // Round 4 ends: Mar 8, 2026 23:59
    1741910399  // Round 5 ends: Mar 12, 2026 23:59
  ];
  
  console.log("\nRound Schedule:");
  console.log("Round 1: Feb 1-12, 2026 | 6¢ | $1.5M | 50% TGE | 15% bonus");
  console.log("Round 2: Feb 13-22, 2026 | 7¢ | $500k | 45% TGE | 12% bonus");
  console.log("Round 3: Feb 23-Mar 2, 2026 | 8¢ | $250k | 40% TGE | 9% bonus");
  console.log("Round 4: Mar 3-8, 2026 | 9¢ | $150k | 35% TGE | 6% bonus");
  console.log("Round 5: Mar 9-12, 2026 | 10¢ | $100k | 30% TGE | 3% bonus");
  
  console.log("\nInitializing rounds...");
  const tx = await presale.initializeRounds(startTimes, endTimes);
  console.log("Transaction hash:", tx.hash);
  
  await tx.wait();
  console.log("✅ Rounds initialized successfully!");
  
  // Verify initialization
  console.log("\nVerifying round 1 configuration...");
  const round1 = await presale.rounds(0);
  console.log("Price:", hre.ethers.utils.formatEther(round1.price), "USDC per SELF ($0.06)");
  console.log("Target:", hre.ethers.utils.formatEther(round1.target), "USDC");
  console.log("TGE Unlock:", round1.tgeUnlock.toString(), "%");
  console.log("Bonus:", round1.bonus.toString(), "%");
  
  console.log("\n=== Initialization Complete ===");
  console.log("Presale is ready to accept contributions starting Feb 1, 2026!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

