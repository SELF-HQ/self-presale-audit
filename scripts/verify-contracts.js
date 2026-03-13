const hre = require("hardhat");

async function main() {
  const contracts = {
    selfToken: process.env.SELF_TOKEN_ADDRESS,
    presale: process.env.PRESALE_ADDRESS
  };
  
  console.log("Verifying contracts on BaseScan...\n");
  
  // Verify SELF Token
  if (contracts.selfToken) {
    console.log("Verifying SELFToken:", contracts.selfToken);
    try {
      await hre.run("verify:verify", {
        address: contracts.selfToken,
        constructorArguments: []
      });
      console.log("✅ SELFToken verified\n");
    } catch (error) {
      console.log("⚠️  SELFToken verification failed:", error.message, "\n");
    }
  }
  
  // Verify Presale
  if (contracts.presale && contracts.selfToken) {
    const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base Mainnet
    const MULTISIG_ADDRESS = process.env.MULTISIG_ADDRESS;
    
    if (!MULTISIG_ADDRESS) {
      throw new Error("MULTISIG_ADDRESS environment variable required for presale verification");
    }
    
    console.log("Verifying SELFPresale:", contracts.presale);
    try {
      await hre.run("verify:verify", {
        address: contracts.presale,
        constructorArguments: [
          USDC_ADDRESS,
          contracts.selfToken,
          MULTISIG_ADDRESS
        ]
      });
      console.log("✅ SELFPresale verified\n");
    } catch (error) {
      console.log("⚠️  SELFPresale verification failed:", error.message, "\n");
    }
  }
  
  console.log("=== Verification Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

