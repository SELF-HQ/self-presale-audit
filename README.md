# SELF Token Presale

Multi-round token presale with integrated vesting on Binance Smart Chain.

## Audit Scope

```
contracts/
├── SELFToken.sol         (~20 lines - Standard ERC20)
└── SELFPresale.sol        (~700 lines - Multi-round presale)
```

## Technical Overview

### SELFToken.sol
- Standard OpenZeppelin ERC20
- Fixed supply: 500,000,000 tokens
- OpenZeppelin v4.9.6

### SELFPresale.sol
- 5 sequential rounds: February 1 - March 12, 2026
- Progressive pricing: $0.06 → $0.10 per token
- Target raise: $2.5M ($500k soft cap, $2.5M hard cap)
- Contribution limits: $100 - $10,000 per wallet (cumulative)
- Vesting: 30-50% TGE unlock + linear 10-month vesting
- Payment: USDC (Binance-Peg) 18 decimals
- OpenZeppelin v4.9.6: AccessControl, ReentrancyGuard, Pausable, SafeERC20

### Security Features
- Role-based access control (5 roles)
- Timelock delays (2-7 days on critical operations)
- Circuit breaker ($500k daily withdrawal limit)
- Refund mechanism (if soft cap not met)
- Unclaimed refund recovery (after 30-day window)
- Flash loan protection (2-block cooldown)
- Whale protection (10% max per tx)
- Rate limiting ($100k/hour per wallet)
- Custom errors (gas optimized)

## BSC USDC Configuration

BSC USDC uses 18 decimals (unlike Ethereum's 6 decimals).

**Contract:** `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`

```solidity
uint256 constant MIN_CONTRIBUTION = 100 * 1e18;      // $100
uint256 constant MAX_CONTRIBUTION = 10_000 * 1e18;   // $10,000
uint256 constant SOFT_CAP = 500_000 * 1e18;          // $500k
uint256 constant HARD_CAP = 2_500_000 * 1e18;        // $2.5M
```

## Testing

```bash
npm install
npx hardhat test
```

44 tests covering token functionality, presale logic, vesting, and edge cases.

`contracts/test/MockUSDC.sol` is a test utility only (18-decimal USDC simulator).

## Repository Structure

```
contracts/
├── SELFToken.sol              # Audit scope
├── SELFPresale.sol            # Audit scope
└── test/MockUSDC.sol          # Test utility

test/
├── SELFToken.test.cjs
└── SELFPresale.test.cjs

scripts/
├── deploy-token.js
├── deploy-presale.js
├── initialize-rounds.js
└── verify-contracts.js

docs/
└── architecture.md
```

## Deployment

**Network:** Binance Smart Chain (BSC) Mainnet  
**USDC:** `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`  
**Compiler:** Solidity 0.8.20  
**Launch:** February 1, 2026

---

**Audit Ready:** December 14, 2025
