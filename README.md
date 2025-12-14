# SELF Token Presale - Certik Audit

## 🎯 Audit Scope: 2 Contracts

This audit covers two smart contracts:

1. **SELFToken.sol** (~20 lines) - Standard OpenZeppelin ERC20 token
2. **SELFPresale.sol** (~500 lines) - Multi-round presale with integrated vesting

All other files in the repository are supporting materials (tests, deployment scripts, documentation).

---

## ⚠️ CRITICAL: BSC USDC Uses 18 Decimals

**Important:** On Binance Smart Chain, USDC uses 18 decimals (unlike Ethereum USDC which uses 6 decimals).

**BSC USDC Contract:** `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`  
[Verify on BscScan](https://bscscan.com/token/0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d)

All contract values are designed for 18-decimal USDC:

```solidity
// Prices (18 decimals)
uint256 constant PRICE_ROUND_1 = 0.06 * 1e18;  // $0.06 per token

// Contribution limits (18 decimals)
uint256 public constant MIN_CONTRIBUTION = 100 * 1e18;      // $100
uint256 public constant MAX_CONTRIBUTION = 10_000 * 1e18;   // $10,000

// Caps (18 decimals)
uint256 public constant SOFT_CAP = 500_000 * 1e18;          // $500k
uint256 public constant HARD_CAP = 2_500_000 * 1e18;        // $2.5M
```

---

## 📋 Contract Details

### 1. SELFToken.sol
- **Type:** Standard OpenZeppelin ERC20 token
- **Supply:** 500,000,000 tokens (fixed supply, minted at deployment)
- **Dependencies:** OpenZeppelin Contracts v4.9.3

### 2. SELFPresale.sol
- **Type:** Multi-round presale with integrated linear vesting
- **Dependencies:** OpenZeppelin v4.9.3 (SafeERC20, ReentrancyGuard, Pausable, Ownable)
- **Launch Date:** February 1, 2026
- **Rounds:** 5 sequential rounds (Feb 1 - Mar 12, 2026)
- **Pricing:** Progressive pricing model ($0.06 → $0.10 per token)
- **Vesting:** Variable TGE unlock (30-50%) + linear vesting over 10 months
- **Payment Token:** USDC (Binance-Peg) on BSC
- **Contribution Limits:** $100 minimum, $10,000 maximum per wallet (cumulative across all rounds)
- **Caps:** $500k soft cap, $2.5M hard cap

### Priority Audit Areas:

**High Priority:**
1. Token allocation math (base + bonus calculations)
2. Vesting & claiming logic (linear 10-month unlock)
3. Fund security (USDC deposits, withdrawals, token distribution)
4. Reentrancy protection (`contribute()`, `claimTokens()`)
5. Access control (owner privileges)

**Medium Priority:**
6. Round management (timing, transitions, boundaries)
7. Contribution limits (per-wallet enforcement)
8. BSC USDC 18-decimal handling

---

## 🔒 Security Features

- **Access Control:** Ownable pattern for administrative functions
- **Reentrancy Protection:** ReentrancyGuard on contribution and claiming functions
- **Pausability:** Emergency pause mechanism for both contracts
- **Time Locks:** Round-based restrictions and vesting schedules
- **Safe Token Transfers:** OpenZeppelin SafeERC20 library

**Post-Deployment:** Contract ownership will be transferred to a Gnosis Safe multi-sig wallet.

---

## 🧪 Testing

Complete test suite with 49 passing tests:

```bash
npm install
npx hardhat test
```

### Test Files:
- `test/SELFToken.test.cjs` - Token functionality (15 tests)
- `test/SELFPresale.test.cjs` - Presale logic, vesting, edge cases (34 tests)

### MockUSDC.sol

`contracts/test/MockUSDC.sol` is a testing utility only (not for audit):
- Used exclusively for local test environment
- Simulates BSC USDC with 18 decimals
- Never deployed to any network

**Production Environment:** Uses official BSC USDC at `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`

---

## 📦 Repository Structure

```
contracts/
├── SELFToken.sol              # ERC20 token (audit scope)
├── SELFPresale.sol            # Presale contract (audit scope)
└── test/
    └── MockUSDC.sol           # Testing utility only

test/
├── SELFToken.test.cjs         # Token test suite
└── SELFPresale.test.cjs       # Presale test suite

scripts/
├── deploy-token.js            # Deployment scripts
├── deploy-presale.js
├── initialize-rounds.js
└── verify-contracts.js

docs/
├── audit-package.md           # Comprehensive technical documentation
├── architecture.md            # System architecture
└── security-considerations.md # Security analysis
```

## 📚 Additional Documentation

For detailed technical information:
- **`docs/audit-package.md`** - Comprehensive audit documentation
- **`docs/architecture.md`** - System architecture and design decisions
- **`docs/security-considerations.md`** - Security model and threat analysis

---

## 📅 Project Timeline

- **Audit Period:** January 2026
- **Presale Launch:** February 1, 2026
- **Presale End:** March 12, 2026 (or when hard cap reached)
- **TGE:** Post-presale (date TBD)

---

## 🚀 Deployment Information

**Target Network:** Binance Smart Chain (BSC) Mainnet  
**Payment Token:** Binance-Peg USDC (`0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`)  
**Compiler:** Solidity 0.8.20  
**OpenZeppelin:** v4.9.3

---

## 📞 Contact

For audit-related questions, please contact through the provided Certik communication channels.

---

**Audit Status:** Ready for Review  
**Last Updated:** December 14, 2025
