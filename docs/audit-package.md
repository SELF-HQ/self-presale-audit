# SELF Token Presale - Audit Package

## Project Overview

**Project:** SELF Token Presale  
**Version:** 1.0.0  
**Audit Target:** Certik Security Audit  
**Launch Date:** February 1, 2026  
**Fundraising Goal:** $2.5M across 5 rounds

## Executive Summary

SELF is launching a 5-round presale for its BEP-20 token on Binance Smart Chain. The presale accepts USDC payments and distributes SELF tokens with varying prices, bonuses, and TGE unlock percentages across five sequential rounds over 40 days.

## Smart Contract Scope

### ✅ IN SCOPE FOR AUDIT

1. **SELFPresale.sol** (~500 lines)
   - 5-round presale logic
   - USDC payment processing
   - Token allocation with bonus system
   - TGE unlock and vesting mechanism
   - Admin functions (pause, withdraw, advance rounds)

2. **SELFToken.sol** (~20 lines)
   - Standard ERC20 token
   - 500M total supply
   - OpenZeppelin Ownable

### ❌ NOT IN SCOPE (Certik Template Contracts)

**The following contracts from Certik's generic template are NOT part of this audit:**

- **SELFBonusStaking.sol** - Not used in this project
- **SELFOracle.sol** - Not used in this project  
- **SELFVesting.sol** - Not used (vesting handled within SELFPresale.sol)

**Note:** This project uses integrated vesting within the presale contract rather than separate vesting/staking/oracle contracts.

### Out of Scope (General)

- Frontend application
- Backend services
- MockUSDC.sol (testing only, never deployed)
- Deployment scripts

## Architecture

### Presale Flow

```
User Flow:
1. User approves USDC spending
2. User calls contribute(amount)
3. Contract calculates SELF allocation based on current round
4. Contract adds bonus tokens
5. Contract records TGE unlock amount and vested amount
6. After all rounds complete, owner enables TGE
7. Users claim tokens (TGE unlock + linear vesting over 10 months)
```

### 5-Round Structure

| Round | Price | Target  | Duration | TGE Unlock | Bonus | Dates |
|-------|-------|---------|----------|------------|-------|-------|
| 1     | 6¢    | $1.5M   | 12 days  | 50%        | 15%   | Feb 1-12 |
| 2     | 7¢    | $500k   | 10 days  | 45%        | 12%   | Feb 13-22 |
| 3     | 8¢    | $250k   | 8 days   | 40%        | 9%    | Feb 23-Mar 2 |
| 4     | 9¢    | $150k   | 6 days   | 35%        | 6%    | Mar 3-8 |
| 5     | 10¢   | $100k   | 4 days   | 30%        | 3%    | Mar 9-12 |

### Key Mechanisms

**Token Allocation:**
- Base tokens = USDC amount / round price
- Bonus tokens = base tokens × round bonus percentage
- Total tokens = base + bonus

**TGE & Vesting:**
- TGE unlock = (base tokens × TGE unlock %) + bonus tokens (100%)
- Vested amount = remaining base tokens
- Vesting period = 10 months linear after TGE
- Claiming: Users can claim anytime; contract calculates unlocked amount

**Security Features:**
- ReentrancyGuard on all state-changing functions
- Pausable for emergency stops
- Ownable with ownership transfer capability
- Min/max contribution limits per wallet ($100-$10k)
- Round targets with auto-finalization
- SafeERC20 for token transfers

## Known Design Decisions

### 1. BSC USDC Decimals (18, not 6)
- BSC USDC uses 18 decimals (different from Ethereum's 6)
- All calculations account for 18 decimal precision
- Prices stored as: 6¢ = 6e16 wei

### 2. Manual Round Advancement
- Owner must manually call `advanceRound()` after finalizing
- Prevents automatic advancement that could trap funds
- Allows time for verification between rounds

### 3. TGE Enablement
- TGE must be manually enabled after all rounds finalize
- Allows flexibility for timing coordination
- Prevents premature claiming

### 4. No Refund Mechanism
- No soft cap with refunds (unlike typical presales)
- All funds committed once contributed
- **Audit Note:** Intentional design for simplicity

### 5. Single Owner Control
- Owner can withdraw USDC anytime
- Owner controls round progression
- Owner enables TGE
- **Mitigation:** Owner will be multi-sig wallet (Gnosis Safe)

## Security Considerations

### High Priority

1. **Reentrancy Protection**
   - ReentrancyGuard on `contribute()` and `claimTokens()`
   - Check-effects-interactions pattern followed
   - External calls (USDC/SELF transfers) happen last

2. **Integer Overflow/Underflow**
   - Solidity 0.8.20 has built-in overflow protection
   - SafeMath not needed
   - All arithmetic operations checked

3. **Access Control**
   - Only owner can finalize, advance, withdraw
   - Only owner can pause/unpause
   - Only owner can enable TGE
   - Ownable pattern from OpenZeppelin

4. **Timestamp Dependence**
   - Round timing uses block.timestamp
   - Acceptable for day-level granularity
   - Not vulnerable to miner manipulation (tolerances > 15 minutes)

### Medium Priority

1. **Gas Limits**
   - No unbounded loops in user-facing functions
   - Owner withdrawal loops prevented (single transfer)
   - Claiming calculated per-user (no global iteration)

2. **Front-Running**
   - Round auto-finalization could be front-run at boundary
   - Impact: User contribution at round N might finalize round N-1
   - **Mitigation:** Clear in docs, acceptable UX trade-off

3. **Denial of Service**
   - Pausing prevents contributions
   - Emergency withdrawal of SELF before TGE available
   - No user can brick contract

### Lower Priority

1. **Centralization**
   - Owner has significant control
   - **Mitigation:** Multi-sig wallet required
   - **Mitigation:** Transparent on-chain actions

2. **Zero Address Checks**
   - Constructor checks USDC and SELF addresses
   - No zero address checks on contributions (handled by USDC contract)

## Test Coverage

### Unit Tests

**SELFPresale.test.js:**
- Deployment and initialization
- Round configuration
- Contribution validation (min/max, timing)
- Token allocation calculations
- Bonus calculations
- TGE unlock calculations
- Vesting calculations over time
- Round finalization and advancement
- TGE enablement and claiming
- Admin functions (pause, withdraw, emergency)
- Reentrancy protection
- Edge cases

**SELFToken.test.js:**
- Standard ERC20 functionality
- Total supply
- Transfers
- Allowances
- Ownership

**Test Execution:**
```bash
npx hardhat test
```

**Expected Coverage:** >95%

## Dependencies

### External Contracts

- OpenZeppelin Contracts v4.9.0+
  - `@openzeppelin/contracts/token/ERC20/ERC20.sol`
  - `@openzeppelin/contracts/token/ERC20/IERC20.sol`
  - `@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol`
  - `@openzeppelin/contracts/security/ReentrancyGuard.sol`
  - `@openzeppelin/contracts/security/Pausable.sol`
  - `@openzeppelin/contracts/access/Ownable.sol`

### Known Issues

None at time of submission.

## Deployment Plan

### Testnet Deployment (Optional)
- Skip testnet deployment for audit
- Hardhat tests provide sufficient coverage

### Mainnet Deployment

1. Deploy SELFToken.sol to BSC mainnet
2. Transfer 42M SELF to deployer wallet (37.7M presale + 4.3M bonus)
3. Deploy SELFPresale.sol with USDC and SELF addresses
4. Transfer 42M SELF to presale contract
5. Call `initializeRounds()` with start/end timestamps
6. Verify contracts on BscScan
7. Transfer ownership to multi-sig wallet
8. Multi-sig tests presale functions
9. Launch Round 1 on Feb 1, 2026

### Post-Deployment

- Owner advances rounds as they complete
- Owner enables TGE after Round 5 finalization
- Users claim tokens after TGE time

## Contact Information

**Project:** SELF Technology Pty Ltd  
**Communication:** [To be provided]  
**Repository:** [To be created - public audit repo]  
**Documentation:** This file + inline NatSpec comments  

## Audit Requirements

### What We Need from Certik

1. **Security Analysis:**
   - Comprehensive vulnerability assessment per Certik checklist
   - Static analysis of contract code
   - Dynamic analysis via test scenarios
   - Formal verification where applicable

2. **Preliminary Report:**
   - Weekly updates during audit period
   - Findings categorized by severity
   - Remediation suggestions

3. **Remediation Window:**
   - Time to fix critical/high findings
   - Re-audit after fixes

4. **Final Report:**
   - Complete audit report
   - Certification suitable for public disclosure
   - Permission to publish report

### Timeline

**Target Dates:**
- Audit Start: Mid-January 2026
- Audit Complete: End of January 2026
- Launch: February 1, 2026

**Critical Deadline:** January 25, 2026 (final report needed 1 week before launch)

## Questions for Auditors

1. Are there any additional security considerations for 18-decimal USDC on BSC?
2. Is the manual round advancement pattern acceptable, or should we automate?
3. Should we add a soft cap with refund mechanism?
4. Any concerns with single-owner control pattern (mitigated by multi-sig)?
5. Recommended multi-sig configuration for owner wallet?

---

**Document Version:** 1.0  
**Last Updated:** December 14, 2025  
**Status:** Ready for Audit Submission

