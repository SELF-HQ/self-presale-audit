# SELF Token Presale

Multi-round token presale with integrated vesting on Base.

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
- 5 sequential rounds with Safe-managed round progression
- Progressive pricing: $0.06 → $0.10 per token
- Presale allocation: exactly 37,934,515 SELF; raise target up to approximately $2.5M
- Contribution limits: $100 - $10,000 per wallet (cumulative)
- Vesting: 40% TGE unlock + linear 12-month vesting
- No round bonuses
- Payment: USDC (native Circle) 6 decimals
- OpenZeppelin v4.9.6: AccessControl, ReentrancyGuard, Pausable, SafeERC20

## Current Deployment

The current presale is deployed on Base mainnet and is awaiting its one-time round initialization. Until `initializeRounds` is executed by the Safe, contributions remain closed.

- **Presale:** [0x9D762B5E519d6194aa829F31cF85317FE37Fe35d](https://basescan.org/address/0x9D762B5E519d6194aa829F31cF85317FE37Fe35d#code)
- **SELF token:** [0xCBFc34863982f7563774F73004fd231982Ff0303](https://basescan.org/address/0xCBFc34863982f7563774F73004fd231982Ff0303#code)
- **Base USDC:** [0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913](https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- **Safe controlling all roles:** [0x8b2fE271c13C94c679b1fF69466C2D6d034b2e8c](https://app.safe.global/home?safe=base:0x8b2fE271c13C94c679b1fF69466C2D6d034b2e8c)
- **Funded allocation:** exactly **37,934,515 SELF**
- **Verification:** exact-match source verified on BaseScan

Contributions are final under the contract and are not subject to a minimum aggregate raise condition. Presale proceeds may be transferred by the Safe subject to the contract's two-day withdrawal delay and $500,000 daily limit. Round progression and TGE scheduling are administered through the Safe-controlled roles.

### Security Features
- Role-based access control (5 roles)
- Timelock delays (2-7 days on critical operations)
- Circuit breaker ($500k daily withdrawal limit)
- Flash loan protection (2-block cooldown)
- Whale protection (10% max per tx)
- Rate limiting ($100k/hour per wallet)
- Custom errors (gas optimized)

## Base USDC Configuration

Base USDC uses 6 decimals (native Circle USDC).

**Contract:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

```solidity
uint256 constant MIN_CONTRIBUTION = 100 * 1e6;      // $100
uint256 constant MAX_CONTRIBUTION = 10_000 * 1e6;   // $10,000
uint256 constant HARD_CAP = 2_500_000 * 1e6;        // $2.5M
```

## Token Distribution & Allocation

### SELF Token Supply
**Total Supply:** 500,000,000 SELF (fixed, non-mintable)

**Initial Distribution:**
- All tokens minted to multisig wallet: `0x8b2fE271c13C94c679b1fF69466C2D6d034b2e8c`
- Exactly 37,934,515 SELF allocated and transferred to the current presale contract
- Remaining tokens retained by multisig for ecosystem development

**Security Measures (SEA-01):**
- 2-of-3 multisig controls all undistributed tokens
- Safe threshold and owners are publicly verifiable on Base
- Full token allocation published at: `https://docs.self.app/tokenomics`
- Team committed to implementing vesting schedules for non-presale allocations

## Governance & Security

### Multisig Wallet

All privileged contract roles and undistributed tokens are controlled by a 2-of-3 multisig wallet for security.

**Safe Multisig Address:** `0x8b2fE271c13C94c679b1fF69466C2D6d034b2e8c`

**Signers:**
- Signer 1: `0x0Ef1692fb24e9baFCdF599f72fBe81841E52c349`
- Signer 2: `0xD7286BB3983316FF3b2e8A27CABc976aA820Ac97`
- Signer 3: `0xF1164C0208168676DF682f7b66AFF4921ec4bF32`

**Verification:** The Safe threshold and owners, together with presale role assignments, are publicly verifiable on Base.

### Contract Roles Assigned to Multisig
- DEFAULT_ADMIN_ROLE
- TREASURY_ROLE
- TGE_ENABLER_ROLE
- ROUND_MANAGER_ROLE
- PAUSER_ROLE

*All privileged operations require approval under the 2-of-3 Safe policy. TGE enablement, treasury withdrawals, and emergency SELF recovery additionally enforce on-chain delays.*

### Timelock Operations (SEA-02)

All critical operations enforce mandatory timelock delays for community transparency:

| Operation | Timelock | Role Required | Guardrails |
|-----------|----------|---------------|-------------|
| Enable TGE | 2 days | TGE_ENABLER_ROLE | One-time enablement; TGE time immutable once set |
| Withdraw USDC | 2 days | TREASURY_ROLE | Circuit breaker: $500k daily limit |
| Emergency SELF Withdrawal | 7 days | DEFAULT_ADMIN_ROLE | Blocked if any user allocations exist |
| Update Rate Limit | None | DEFAULT_ADMIN_ROLE | Bounded: $100 - $1M range |
| Pause/Unpause | None | PAUSER_ROLE | Emergency circuit breaker only |

**Monitoring Events:**
- `TimelockRequested(action, executionTime)` - Initiates countdown
- `TimelockExecuted(action)` - Confirms execution after delay
- `TimelockCancelled(action)` - Operation cancelled before execution

All events are publicly visible on BaseScan for community monitoring.

**Centralization Mitigation:**
- Short-term: Timelock + multisig combination (implemented)
- Long-term: DAO governance transition planned post-launch
- Permanent: Critical user protections enforced on-chain (SELF-claim solvency)

**Published source:** `https://docs.self.app/tokenomics`

## Security Guarantees

### Hard On-Chain Invariants

The presale contract enforces critical security invariants in code, not operational policy:

#### 1. Solvency Protection
- **USDC Withdrawals**: Treasury withdrawals are governed by 2-of-3 multisig approval, a 2-day timelock, and a $500k/day circuit breaker.
- **SELF Token Claims**: Contributions require sufficient SELF balance on-chain. Contract verifies `balance >= outstandingClaims + newAllocation` before accepting contributions.
- **Emergency Safeguards**: Emergency SELF withdrawals blocked once any user allocations exist.

#### 2. TGE Immutability
- Token Generation Event can only be enabled once
- Multiple layers prevent TGE time from being changed after activation:
  - Pending request check (prevents request overwrites)
  - Execution guard (prevents multiple executions)
  - Explicit cancellation required to replace pending requests

#### 3. User Protections
- **Precision Math**: All token calculations round up in favor of users
- **Dust Handling**: Allows exact completion of rounds when remaining capacity < minimum contribution

### Zero-Trust Operator Model

Privileged actions are constrained by code and multisig, not operator discretion:

- All privileged roles require 2-of-3 multisig approval
- Cannot drain SELF tokens needed for user claims
- Cannot change TGE time after activation
- TGE enablement, treasury withdrawals, and emergency SELF recovery provide on-chain transparency windows (2-7 days)
- Circuit breaker limits withdrawal velocity ($500k/day)

### Transparency & Monitoring

Public view functions for external verification:

- `getExcessSELFBalance()` - Shows withdrawable excess vs. outstanding claims
- `getClaimableAmount(user)` - Shows user's vested + unlocked tokens
- `getUserContribution(user)` - Complete user allocation breakdown
- `getPresaleStats()` - Aggregate presale state

All privileged operations emit events for on-chain monitoring.

### Security Design

**Centralization Controls:**
- Initial token distribution is controlled by a 2-of-3 multisig with a published allocation
- Privileged roles are constrained by multisig approval and on-chain invariants; selected TGE and treasury actions also enforce timelocks and a circuit breaker

**Unsold Token Recovery:**

The contract protects against SELF tokens being locked while safeguarding buyer claims:

- `withdrawExcessSELF()` allows the treasury to reclaim unsold SELF after TGE
- Protected: cannot withdraw tokens needed for outstanding user claims
- Formula: `excess = balance - (totalAllocated - totalClaimed)`
- `executeEmergencyWithdrawSELF()` recovers SELF only before any user allocations exist (7-day timelock), so buyer claims can never be stranded

**Test Coverage:** 49 passing tests, zero compiler warnings

**Deployed Contracts (Base Mainnet):**
- SELF Token Contract: [0xCBFc34863982f7563774F73004fd231982Ff0303](https://basescan.org/address/0xCBFc34863982f7563774F73004fd231982Ff0303#code)
- SELFPresale: [0x9D762B5E519d6194aa829F31cF85317FE37Fe35d](https://basescan.org/address/0x9D762B5E519d6194aa829F31cF85317FE37Fe35d#code) — verified, funded with exactly 37,934,515 SELF, and awaiting initialization

## Testing

```bash
npm install
npx hardhat test
```

Tests cover token functionality, presale logic, vesting, and edge cases.

`contracts/test/MockUSDC.sol` is a test utility only (6-decimal USDC simulator).

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

**Network:** Base Mainnet  
**USDC:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`  
**Compiler:** Solidity 0.8.20, optimizer enabled with 200 runs  
**Status:** Deployed, exact-match verified, funded, and awaiting one-time round initialization

---

**Audit Ready:** December 14, 2025  
**Skyharbor Updated V1.1:** December 25, 2025  
**Skyharbor Updated V1.2:** December 30, 2025  
**SEA-16 Fix V1.3:** December 31, 2025  
**Per-Round Accounting Fix V1.4:** January 1, 2026  
**Base Migration V1.5:** March 13, 2026  
**Tokenomics Update V1.6:** April 8, 2026 — Unified TGE unlock to 40%, removed bonuses, extended vesting to 12 months  
**Treasury Model Update V1.7:** Streamlined treasury withdrawals under 2-of-3 multisig, 2-day timelock, and $500k/day circuit breaker  
**Current Deployment V1.8:** Base mainnet exact-match deployment at `0x9D762B5E519d6194aa829F31cF85317FE37Fe35d`; no refund mechanism or minimum aggregate raise condition
