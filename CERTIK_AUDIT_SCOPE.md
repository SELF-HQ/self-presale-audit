# Certik Audit Scope - SELF Token Presale

## 🎯 Contracts to Audit

This audit covers **2 contracts only**:

```
contracts/
├── ✅ SELFToken.sol         (ERC20 token - 500M supply)
└── ✅ SELFPresale.sol        (5-round presale with integrated vesting)
```

---

## ❌ Certik Template Contracts NOT Included

Your initial template mentioned these contracts, but they are **NOT part of this project**:

- ❌ **SELFBonusStaking.sol** - Not implemented (no staking functionality)
- ❌ **SELFOracle.sol** - Not implemented (no oracle needed)
- ❌ **SELFVesting.sol** - Not needed (vesting is built into SELFPresale.sol)

**Reason:** This is a focused presale project with integrated vesting. We do not use separate staking, oracle, or vesting contracts.

---

## 📋 Contract Details

### 1. SELFToken.sol (~20 lines)

**Type:** Standard ERC20 token  
**Dependencies:** OpenZeppelin ERC20, Ownable  
**Key Features:**
- 500,000,000 total supply (minted at deployment)
- Standard ERC20 functionality
- Ownable for initial distribution control

**Audit Focus:** Standard ERC20 implementation review

---

### 2. SELFPresale.sol (~500 lines)

**Type:** Multi-round presale with integrated vesting  
**Dependencies:** OpenZeppelin (SafeERC20, ReentrancyGuard, Pausable, Ownable)  
**Key Features:**
- 5 sequential presale rounds (Feb 1 - Mar 12, 2026)
- Progressive pricing: $0.06 → $0.10 per token
- Variable TGE unlocks: 50% → 30%
- Variable bonus tokens: 15% → 3%
- 10-month linear vesting for locked tokens
- USDC payment processing (BSC USDC uses 18 decimals)
- Min/max contribution limits ($100-$10,000)
- Emergency pause functionality
- Owner-controlled round advancement

**Audit Focus:**
- Fund security (USDC collection and withdrawal)
- Token allocation calculations (base + bonus)
- Vesting logic and claiming mechanism
- Round management and state transitions
- Access control (owner functions)
- Reentrancy protection
- Pausability and emergency procedures
- BSC USDC 18-decimal handling

---

## 🔍 Critical Audit Areas

### High Priority:

1. **Token Allocation Math**
   - Contribution → SELF token calculation
   - Bonus token calculation
   - TGE unlock percentage application
   - Vesting amount calculation

2. **Vesting & Claiming**
   - Linear vesting over 10 months
   - Claimable amount calculation
   - Protection against double-claiming
   - Time-based unlock logic

3. **Fund Security**
   - USDC deposit handling
   - SELF token distribution
   - Owner withdrawal mechanism
   - Emergency SELF recovery before TGE

4. **Reentrancy Protection**
   - `contribute()` function
   - `claimTokens()` function
   - External token calls

5. **Access Control**
   - Owner-only functions
   - Round initialization
   - TGE enablement
   - Emergency pause

### Medium Priority:

6. **Round Management**
   - Round timing validation
   - Auto-finalization when target reached
   - Manual advancement between rounds
   - Edge cases at round boundaries

7. **Contribution Limits**
   - Per-wallet max ($10,000 total)
   - Per-contribution min ($100)
   - Enforcement across rounds

8. **BSC USDC Decimals**
   - Correct 18-decimal handling (not 6)
   - Price calculations
   - Display/formatting consistency

---

## 📦 Supporting Files (Not for Audit)

These files are **NOT** smart contracts and do **NOT** need auditing:

- `contracts/test/MockUSDC.sol` - Test helper (never deployed)
- `scripts/*.js` - Deployment scripts
- `test/*.js` - Test suite
- `.env.example` - Environment configuration template

---

## 🧪 Test Coverage

- Comprehensive unit tests in `test/SELFPresale.test.js`
- Token tests in `test/SELFToken.test.cjs`
- Run tests: `npx hardhat test`
- Expected coverage: >95%

---

## 📅 Timeline

- **Audit Start:** January 2026
- **Audit Complete:** Late January 2026
- **Presale Launch:** February 1, 2026 (Round 1 start)

---

## 📞 Questions?

If you need clarification on the contract scope or have questions about why certain contracts from your template are not included, please contact us.

**This is a presale-focused audit. We are NOT auditing staking, oracle, or standalone vesting contracts.**

---

**Last Updated:** December 13, 2025  
**Status:** Ready for Submission

