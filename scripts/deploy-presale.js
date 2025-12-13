const hre = require("hardhat");

async function main() {
  // Configuration
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"; // BSC Mainnet USDC
  const SELF_TOKEN_ADDRESS = process.env.SELF_TOKEN_ADDRESS;
  
  if (!SELF_TOKEN_ADDRESS) {
    throw new Error("SELF_TOKEN_ADDRESS environment variable not set");
  }
  
  console.log("Deploying SELFPresale to BSC...");
  console.log("USDC Address:", USDC_ADDRESS);
  console.log("SELF Token Address:", SELF_TOKEN_ADDRESS);
  
  const SELFPresale = await hre.ethers.getContractFactory("SELFPresale");
  const presale = await SELFPresale.deploy(
    USDC_ADDRESS,
    SELF_TOKEN_ADDRESS
  );
  await presale.deployed();
  
  console.log("✅ SELFPresale deployed to:", presale.address);
  
  // Wait for confirmations
  console.log("\nWaiting for block confirmations...");
  await presale.deployTransaction.wait(5);
  
  // Verify on BscScan
  console.log("\nVerifying contract on BscScan...");
  try {
    await hre.run("verify:verify", {
      address: presale.address,
      constructorArguments: [
        USDC_ADDRESS,
        SELF_TOKEN_ADDRESS
      ]
    });
    console.log("✅ Contract verified on BscScan");
  } catch (error) {
    console.log("⚠️  Verification failed:", error.message);
  }
  
  console.log("\n=== Deployment Complete ===");
  console.log("Presale Address:", presale.address);
  console.log("\n=== NEXT STEPS ===");
  console.log("1. Transfer SELF tokens to presale contract:");
  console.log(`   Amount: 42,000,000 SELF (37.7M presale + 4.3M bonus pool)`);
  console.log(`   To: ${presale.address}`);
  console.log("2. Initialize rounds using initialize-rounds.js");
  console.log("3. Transfer ownership to multi-sig wallet");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

