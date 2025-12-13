const hre = require("hardhat");

async function main() {
  console.log("Deploying SELFToken to BSC...");
  
  const SELFToken = await hre.ethers.getContractFactory("SELFToken");
  const selfToken = await SELFToken.deploy();
  await selfToken.deployed();
  
  console.log("✅ SELFToken deployed to:", selfToken.address);
  console.log("   Total Supply: 500,000,000 SELF");
  
  // Wait for block confirmations
  console.log("\nWaiting for block confirmations...");
  await selfToken.deployTransaction.wait(5);
  
  // Verify on BscScan
  console.log("\nVerifying contract on BscScan...");
  try {
    await hre.run("verify:verify", {
      address: selfToken.address,
      constructorArguments: []
    });
    console.log("✅ Contract verified on BscScan");
  } catch (error) {
    console.log("⚠️  Verification failed:", error.message);
  }
  
  console.log("\n=== Deployment Complete ===");
  console.log("SELF Token Address:", selfToken.address);
  console.log("\nSave this address for presale deployment!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

