const hre = require("hardhat");

async function main() {
  const PRESALE_ADDRESS = process.env.PRESALE_ADDRESS;

  if (!PRESALE_ADDRESS) {
    throw new Error("PRESALE_ADDRESS environment variable not set");
  }

  console.log("Initializing 5 presale rounds...");
  console.log("Presale Address:", PRESALE_ADDRESS);

  const presale = await hre.ethers.getContractAt(
    "SELFPresale",
    PRESALE_ADDRESS,
  );

  // Scheduling model: round transitions are MANUAL (ROUND_MANAGER calls
  // finalizeRound / advanceRound). Rounds also auto-finalize when their target
  // is hit, but advancing to the next round is always a manual action.
  //
  // endTimes are IMMUTABLE, hard per-round contribution deadlines. There is no
  // setter to change them after this one-time call. They are set years out so the
  // clock never forces an intervention or freezes contributions. Manual
  // finalize/advance is the real control; the backstops are a safety net only.
  //
  // Contract rules enforced at init (all must hold):
  //   startTimes[i] > block.timestamp   (every round start in the future)
  //   endTimes[i]   > startTimes[i]
  //   startTimes[i] > endTimes[i-1]     (rounds strictly sequential)
  // Only Round 1's startTime gates going live; rounds 2-5 go live when advanced to,
  // so their start/end values are validation formalities plus the deadline backstop.

  const DAY = 24 * 60 * 60;
  const toTs = (iso) => Math.floor(new Date(iso).getTime() / 1000);

  // Round 1 opens ~24h from now, so it is always safely in the future no matter
  // when this script (or the equivalent multisig tx) is executed.
  const round1Start = Math.floor(Date.now() / 1000) + DAY;

  const startTimes = [
    round1Start,
    toTs("2028-01-02T00:00:00Z"), // R2 (goes live on advance)
    toTs("2029-01-02T00:00:00Z"), // R3
    toTs("2030-01-02T00:00:00Z"), // R4
    toTs("2031-01-02T00:00:00Z"), // R5
  ];

  const endTimes = [
    toTs("2028-01-01T00:00:00Z"), // R1 backstop
    toTs("2029-01-01T00:00:00Z"), // R2 backstop
    toTs("2030-01-01T00:00:00Z"), // R3 backstop
    toTs("2031-01-01T00:00:00Z"), // R4 backstop
    toTs("2032-01-01T00:00:00Z"), // R5 backstop
  ];

  console.log(
    "\nComputed timestamps (copy into Safe Transaction Builder if calling via multisig):",
  );
  console.log("startTimes:", JSON.stringify(startTimes));
  console.log("endTimes:  ", JSON.stringify(endTimes));

  console.log(
    "\nRound schedule (prices and targets are fixed in the contract):",
  );
  console.log("Round 1: 6c  | $1.5M target | 40% TGE | 0% bonus");
  console.log("Round 2: 7c  | $500k target | 40% TGE | 0% bonus");
  console.log("Round 3: 8c  | $250k target | 40% TGE | 0% bonus");
  console.log("Round 4: 9c  | $150k target | 40% TGE | 0% bonus");
  console.log("Round 5: 10c | $100k target | 40% TGE | 0% bonus");

  console.log("\nInitializing rounds...");
  const tx = await presale.initializeRounds(startTimes, endTimes);
  console.log("Transaction hash:", tx.hash);

  await tx.wait();
  console.log("Rounds initialized successfully.");

  // Verify initialization
  console.log("\nVerifying round 1 configuration...");
  const round1 = await presale.rounds(0);
  console.log(
    "Price:",
    hre.ethers.formatUnits(round1.price, 6),
    "USDC per SELF ($0.06)",
  );
  console.log("Target:", hre.ethers.formatUnits(round1.target, 6), "USDC");
  console.log(
    "Start:",
    new Date(Number(round1.startTime) * 1000).toISOString(),
  );
  console.log(
    "End (backstop):",
    new Date(Number(round1.endTime) * 1000).toISOString(),
  );
  console.log("TGE Unlock:", round1.tgeUnlock.toString(), "%");

  console.log("\n=== Initialization Complete ===");
  console.log("Round 1 opens:", new Date(round1Start * 1000).toISOString());
  console.log(
    "Rounds 2-5 go live instantly when advanced to (ROUND_MANAGER controls transitions).",
  );
  console.log(
    "End times are multi-year safety backstops; manual finalize/advance is the real control.",
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
