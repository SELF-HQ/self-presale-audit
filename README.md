# SELF Token Presale - Certik Audit

## 🎯 Audit Scope: 2 Contracts Only

```
contracts/
├── ✅ SELFToken.sol         (~20 lines - Standard ERC20)
└── ✅ SELFPresale.sol        (~500 lines - Multi-round presale with vesting)
```

### ❌ Template Contracts NOT Included

Your template mentioned these contracts, but they are **NOT part of this project**:
- ❌ SELFBonusStaking.sol - Not implemented
- ❌ SELFOracle.sol - Not implemented  
- ❌ SELFVesting.sol - Not needed (vesting is integrated in SELFPresale.sol)

**This is a focused presale project with integrated vesting only.**

---

## ⚠️ CRITICAL: BSC USDC Uses 18 Decimals

**Most important thing to know before reviewing:**

On Binance Smart Chain, **USDC uses 18 decimals**, not 6 like Ethereum USDC.

**Official BSC USDC:** `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`  
Verify: https://bscscan.com/token/0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d

### Impact on Contract

All values in `SELFPresale.sol` use 18 decimals:

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

**This is correct for BSC - not an error.**

---

## 📋 Contract Details

### 1. SELFToken.sol
- **Type:** Standard OpenZeppelin ERC20
- **Supply:** 500,000,000 tokens (minted at deployment)
- **Audit Focus:** Standard ERC20 implementation review

### 2. SELFPresale.sol
- **Type:** Multi-round presale with integrated linear vesting
- **Dependencies:** OpenZeppelin (SafeERC20, ReentrancyGuard, Pausable, Ownable)
- **Timeline:** 5 rounds, Feb 1 - Mar 12, 2026
- **Pricing:** Progressive ($0.06 → $0.10 per token)
- **Vesting:** Variable TGE unlock (50% → 30%) + 10-month linear vesting
- **Contribution Limits:** $100 min, $10,000 max per wallet (cumulative)

### Critical Audit Areas:

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

## 🔒 Owner Privileges

The contract owner has significant control:
- Pause/unpause contract
- Enable TGE (one-time, irreversible)
- Withdraw USDC after soft cap reached
- Emergency SELF withdrawal before presale starts

**Production Plan:** Owner will be a Gnosis Safe multi-sig wallet.

---

## 🧪 Testing

Run full test suite:
```bash
npm install
npx hardhat test
```

**Expected:** 49/49 tests passing (100% coverage)

### MockUSDC - NOT FOR AUDIT

`contracts/test/MockUSDC.sol` is a **testing utility only** - do not audit.
- Used for local testing only
- Has `mint()` function for test setup
- Never deployed to any network

Production uses official BSC USDC: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`

---

## 📦 Additional Documentation

- `docs/audit-package.md` - Comprehensive technical details
- `docs/architecture.md` - System architecture
- `docs/security-considerations.md` - Security analysis

---

## 📅 Timeline

- **Audit Start:** January 2026
- **Audit Complete:** Late January 2026
- **Presale Launch:** February 1, 2026

---

## 📞 Questions?

Contact information available in `package.json` or reach out through your Certik project manager.

**Ready for audit - all tests passing, documentation complete.**

---

**Last Updated:** December 14, 2025  
**Status:** Ready for Submission
