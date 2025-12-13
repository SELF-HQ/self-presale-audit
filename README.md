# SELF Token Presale - Security Audit Package

**Audit Firm:** Certik  
**Project:** SELF Token Presale on Binance Smart Chain  
**Audit Start:** TBD  
**Status:** Pending Submission


## ⚠️ CRITICAL: Read This First

**BSC USDC uses 18 decimals (NOT 6 like Ethereum USDC)**

This is the most important thing auditors need to know. All contract calculations use 18-decimal USDC.
See [AUDIT_NOTES.md](AUDIT_NOTES.md) for detailed explanation.

## Overview

This repository contains the complete audit package for the SELF token presale smart contracts. The presale will launch on February 1st, 2026 on Binance Smart Chain (BSC).

## Contracts for Audit

### ✅ In Scope (2 contracts):

- **SELFToken.sol** - ERC20 token contract (500M total supply)
- **SELFPresale.sol** - 5-round presale contract with USDC payments and integrated vesting

### ❌ Not In Scope:

Certik's template mentioned these contracts, but they are **NOT part of this project**:
- SELFBonusStaking.sol (not used)
- SELFOracle.sol (not used)
- SELFVesting.sol (not used - vesting is integrated in SELFPresale.sol)

## Key Features

- 5 presale rounds with progressive pricing ($0.06 - $0.10)
- Variable TGE unlock percentages (50% - 30%)
- Bonus token distribution (15% - 3%)
- Soft cap: $500,000
- Hard cap: $2,500,000
- Payment: USDC (Binance-Peg) on BSC
- Vesting: 10-month linear vesting for locked tokens

## Repository Contents

```
/contracts/           # Smart contract source code
  SELFToken.sol
  SELFPresale.sol
  test/MockUSDC.sol   # For testing only

/test/                # Comprehensive test suite
  SELFToken.test.js
  SELFPresale.test.js

/scripts/             # Deployment and utility scripts
  deploy-token.js
  deploy-presale.js
  initialize-rounds.js
  verify-contracts.js

/docs/                # Documentation
  architecture.md
  security-considerations.md
  audit-package.md

/                     # Configuration
  hardhat.config.cjs
  package.json
```

## Security Considerations

See [docs/security-considerations.md](docs/security-considerations.md) for detailed analysis of:
- Access control patterns
- Reentrancy protection
- Arithmetic safety
- Time-based logic
- Emergency procedures

## Testing

```bash
npm install
npx hardhat test
npx hardhat coverage
```

## Deployment (BSC Testnet)

```bash
npx hardhat run scripts/deploy-token.js --network bscTestnet
npx hardhat run scripts/deploy-presale.js --network bscTestnet
npx hardhat run scripts/initialize-rounds.js --network bscTestnet
```

## Important Addresses

**BSC Mainnet:**
- USDC: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` (Binance-Peg USDC)
- Treasury: (To be set in environment variables)

**Note:** BSC USDC uses 18 decimals (not 6 like Ethereum USDC)

## Audit Scope

All contracts in `/contracts/` except `/contracts/test/` which are for local testing only.

## Contact

- **Team:** SELF HQ
- **Website:** https://self.app
- **Documentation:** https://docs.self.app

## License

See LICENSE file for details.
