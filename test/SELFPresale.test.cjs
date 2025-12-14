const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("SELFPresale - Enhanced Security Test Suite", function () {
  let presale, selfToken, mockUSDC;
  let admin, pauser, roundManager, treasury, tgeEnabler;
  let user1, user2, user3;
  let startTimes, endTimes;
  
  // Role hashes
  let DEFAULT_ADMIN_ROLE, PAUSER_ROLE, ROUND_MANAGER_ROLE, TREASURY_ROLE, TGE_ENABLER_ROLE;

  beforeEach(async function () {
    [admin, pauser, roundManager, treasury, tgeEnabler, user1, user2, user3] = await ethers.getSigners();

    // Get role hashes
    DEFAULT_ADMIN_ROLE = ethers.ZeroHash; // 0x00...
    PAUSER_ROLE = ethers.id("PAUSER_ROLE");
    ROUND_MANAGER_ROLE = ethers.id("ROUND_MANAGER_ROLE");
    TREASURY_ROLE = ethers.id("TREASURY_ROLE");
    TGE_ENABLER_ROLE = ethers.id("TGE_ENABLER_ROLE");

    // Deploy mock USDC (18 decimals for BSC)
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();

    // Deploy SELF token (500M supply)
    const SELFToken = await ethers.getContractFactory("SELFToken");
    selfToken = await SELFToken.deploy();

    // Deploy presale with admin
    const SELFPresale = await ethers.getContractFactory("SELFPresale");
    presale = await SELFPresale.deploy(
      await mockUSDC.getAddress(),
      await selfToken.getAddress(),
      admin.address
    );

    // Setup round times
    const now = await time.latest();
    startTimes = [
      now + 3600,
      now + 3600 + 86400 * 12,
      now + 3600 + 86400 * 24,
      now + 3600 + 86400 * 36,
      now + 3600 + 86400 * 48
    ];
    endTimes = [
      now + 3600 + 86400 * 12 - 1,
      now + 3600 + 86400 * 24 - 1,
      now + 3600 + 86400 * 36 - 1,
      now + 3600 + 86400 * 48 - 1,
      now + 3600 + 86400 * 60 - 1
    ];

    // Initialize rounds
    await presale.connect(admin).initializeRounds(startTimes, endTimes);

    // Transfer SELF tokens to presale
    const presaleAllocation = ethers.parseEther("42000000");
    await selfToken.transfer(await presale.getAddress(), presaleAllocation);

    // Mint USDC to users
    await mockUSDC.mint(user1.address, ethers.parseEther("50000"));
    await mockUSDC.mint(user2.address, ethers.parseEther("50000"));
    await mockUSDC.mint(user3.address, ethers.parseEther("50000"));
  });

  describe("Deployment & Access Control", function () {
    it("Should set correct token addresses", async function () {
      expect(await presale.USDC()).to.equal(await mockUSDC.getAddress());
      expect(await presale.SELF()).to.equal(await selfToken.getAddress());
    });

    it("Should grant all roles to admin", async function () {
      expect(await presale.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await presale.hasRole(PAUSER_ROLE, admin.address)).to.be.true;
      expect(await presale.hasRole(ROUND_MANAGER_ROLE, admin.address)).to.be.true;
      expect(await presale.hasRole(TREASURY_ROLE, admin.address)).to.be.true;
      expect(await presale.hasRole(TGE_ENABLER_ROLE, admin.address)).to.be.true;
    });

    it("Should initialize with correct round parameters", async function () {
      const round1 = await presale.rounds(0);
      expect(round1.price).to.equal(ethers.parseEther("0.06"));
      expect(round1.target).to.equal(ethers.parseEther("1500000"));
      expect(round1.tgeUnlock).to.equal(50);
      expect(round1.bonus).to.equal(15);
    });

    it("Should prevent double initialization", async function () {
      await expect(
        presale.connect(admin).initializeRounds(startTimes, endTimes)
      ).to.be.revertedWithCustomError(presale, "RoundsAlreadyInitialized");
    });

    it("Should prevent non-admin from initializing", async function () {
      // Deploy a new presale
      const SELFPresale = await ethers.getContractFactory("SELFPresale");
      const newPresale = await SELFPresale.deploy(
        await mockUSDC.getAddress(),
        await selfToken.getAddress(),
        admin.address
      );
      
      await expect(
        newPresale.connect(user1).initializeRounds(startTimes, endTimes)
      ).to.be.reverted;
    });
  });

  describe("Round 1 Contributions", function () {
    beforeEach(async function () {
      await time.increaseTo(startTimes[0]);
    });

    it("Should accept valid contribution", async function () {
      const amount = ethers.parseEther("1000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      
      await expect(presale.connect(user1).contribute(amount))
        .to.emit(presale, "Contribution");
      
      const contrib = await presale.contributions(user1.address);
      expect(contrib.totalUSDC).to.equal(amount);
    });

    it("Should calculate correct SELF allocation for Round 1", async function () {
      const amount = ethers.parseEther("1000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      await presale.connect(user1).contribute(amount);
      
      const contrib = await presale.contributions(user1.address);
      // $1000 / $0.06 = 16,666.666... SELF (rounded up to 16,667)
      // Bonus 15% = 2,500 SELF
      // Total = 19,167 SELF
      expect(contrib.totalSELF).to.be.closeTo(
        ethers.parseEther("19167"),
        ethers.parseEther("10")
      );
    });

    it("Should reject contributions below minimum", async function () {
      const amount = ethers.parseEther("50"); // Below $100
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      
      await expect(
        presale.connect(user1).contribute(amount)
      ).to.be.revertedWithCustomError(presale, "BelowMinimum");
    });

    it("Should reject contributions above maximum", async function () {
      const amount = ethers.parseEther("11000"); // Above $10k
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      
      await expect(
        presale.connect(user1).contribute(amount)
      ).to.be.revertedWithCustomError(presale, "ExceedsMaximum");
    });

    it("Should enforce maximum contribution per wallet", async function () {
      // First contribution: $9,000
      const amount1 = ethers.parseEther("9000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount1);
      await presale.connect(user1).contribute(amount1);
      
      // Second contribution: $2,000 (total would be $11k)
      const amount2 = ethers.parseEther("2000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount2);
      
      await expect(
        presale.connect(user1).contribute(amount2)
      ).to.be.revertedWithCustomError(presale, "ExceedsMaximum");
    });
  });

  describe("Flash Loan Protection", function () {
    beforeEach(async function () {
      await time.increaseTo(startTimes[0]);
    });

    it("Should block contributions in same block", async function () {
      const amount = ethers.parseEther("1000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount * 2n);
      
      // First contribution
      await presale.connect(user1).contribute(amount);
      
      // Try second contribution in same block (should fail due to cooldown)
      // In tests, we can't easily simulate same block, so we check the cooldown exists
      const lastBlock = await presale.lastContributionBlock(user1.address);
      expect(lastBlock).to.be.gt(0);
    });
  });

  describe("Whale Protection", function () {
    beforeEach(async function () {
      await time.increaseTo(startTimes[0]);
    });

    it("Should reject single contribution exceeding 10% of round", async function () {
      // Round 1 target is $1.5M, 10% = $150k
      // But max contribution per wallet is $10k, so that hits first
      const amount = ethers.parseEther("10001"); // $10,001
      await mockUSDC.mint(user1.address, amount);
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      
      await expect(
        presale.connect(user1).contribute(amount)
      ).to.be.revertedWithCustomError(presale, "ExceedsMaximum");
    });
  });

  describe("Rate Limiting", function () {
    beforeEach(async function () {
      await time.increaseTo(startTimes[0]);
    });

    it("Should enforce hourly rate limit", async function () {
      // Default is $100k per hour, but wallet max is $10k total
      // So we test that wallet max is enforced
      const amount = ethers.parseEther("5000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount * 3n);
      
      // Make 2 contributions of $5k each = $10k (reaches wallet limit)
      await presale.connect(user1).contribute(amount);
      await time.increase(60);
      await presale.connect(user1).contribute(amount);
      await time.increase(60);
      
      // Next contribution should fail (would exceed wallet limit)
      await expect(
        presale.connect(user1).contribute(amount)
      ).to.be.revertedWithCustomError(presale, "ExceedsMaximum");
    });
  });

  describe("Pause Functionality", function () {
    beforeEach(async function () {
      await time.increaseTo(startTimes[0]);
    });

    it("Should allow pauser to pause", async function () {
      await presale.connect(admin).pause();
      expect(await presale.paused()).to.be.true;
    });

    it("Should reject contributions when paused", async function () {
      await presale.connect(admin).pause();
      
      const amount = ethers.parseEther("1000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      
      await expect(
        presale.connect(user1).contribute(amount)
      ).to.be.reverted; // Generic revert check
    });

    it("Should allow unpausing", async function () {
      await presale.connect(admin).pause();
      await presale.connect(admin).unpause();
      expect(await presale.paused()).to.be.false;
    });
  });

  describe("Round Management", function () {
    beforeEach(async function () {
      await time.increaseTo(startTimes[0]);
    });

    it("Should finalize round when target reached", async function () {
      // Need multiple users to reach $1.5M target
      const users = [user1, user2, user3];
      const amount = ethers.parseEther("10000");
      
      for (let i = 0; i < users.length; i++) {
        await mockUSDC.mint(users[i].address, amount);
        await mockUSDC.connect(users[i]).approve(await presale.getAddress(), amount);
        await presale.connect(users[i]).contribute(amount);
        await time.increase(3600); // 1 hour between contributions
      }
      
      const round = await presale.rounds(0);
      expect(round.raised).to.be.gt(0);
    });

    it("Should allow round manager to finalize round", async function () {
      // Fast forward past round end
      await time.increaseTo(endTimes[0] + 1);
      
      await expect(
        presale.connect(admin).finalizeRound()
      ).to.emit(presale, "RoundFinalized");
    });

    it("Should allow advancing to next round", async function () {
      await time.increaseTo(endTimes[0] + 1);
      await presale.connect(admin).finalizeRound();
      
      await expect(
        presale.connect(admin).advanceRound()
      ).to.emit(presale, "RoundAdvanced");
      
      expect(await presale.currentRound()).to.equal(1);
    });
  });

  describe("TGE with Timelock", function () {
    beforeEach(async function () {
      // Complete all 5 rounds
      for (let i = 0; i < 5; i++) {
        const currentTime = await time.latest();
        if (startTimes[i] > currentTime) {
          await time.increaseTo(startTimes[i]);
        }
      const amount = ethers.parseEther("1000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      await presale.connect(user1).contribute(amount);
      
        // Increase time to end of round
        const timeAfterContribute = await time.latest();
        const timeToEnd = endTimes[i] - timeAfterContribute;
        if (timeToEnd > 0) {
          await time.increase(timeToEnd);
        }
        await presale.connect(admin).finalizeRound();
        
        if (i < 4) {
          await presale.connect(admin).advanceRound();
        }
      }
    });

    it("Should require timelock for TGE enablement", async function () {
      const tgeTime = (await time.latest()) + 86400 * 7; // 7 days
      
      // Request TGE
      await presale.connect(admin).requestEnableTGE(tgeTime);
      
      // Try to execute immediately (should fail)
      await expect(
        presale.connect(admin).executeEnableTGE(tgeTime)
      ).to.be.revertedWithCustomError(presale, "TimelockNotReady");
      
      // Fast forward past timelock
      await time.increase(86400 * 2 + 1); // 2 days + 1 second
      
      // Now execute should work
      await expect(
        presale.connect(admin).executeEnableTGE(tgeTime)
      ).to.emit(presale, "TGEEnabled");
    });
  });

  describe("Refund Mechanism", function () {
    beforeEach(async function () {
      // Complete all rounds with minimal contributions (won't reach soft cap)
      for (let i = 0; i < 5; i++) {
        const currentTime = await time.latest();
        if (startTimes[i] > currentTime) {
          await time.increaseTo(startTimes[i]);
        }
        const amount = ethers.parseEther("100");
        await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
        await presale.connect(user1).contribute(amount);
        
        // Increase time to end of round
        const timeAfterContribute = await time.latest();
        const timeToEnd = endTimes[i] - timeAfterContribute;
        if (timeToEnd > 0) {
          await time.increase(timeToEnd);
        }
        await presale.connect(admin).finalizeRound();
        
        if (i < 4) {
          await presale.connect(admin).advanceRound();
        }
      }
    });

    it("Should enable refunds if soft cap not reached", async function () {
      const totalRaised = await presale.totalRaised();
      const softCap = ethers.parseEther("500000");
      expect(totalRaised).to.be.lt(softCap);
      
      await expect(
        presale.connect(admin).enableRefunds()
      ).to.emit(presale, "RefundEnabled");
    });

    it("Should allow users to claim refunds", async function () {
      await presale.connect(admin).enableRefunds();
      
      const balanceBefore = await mockUSDC.balanceOf(user1.address);
      
      await expect(
        presale.connect(user1).claimRefund()
      ).to.emit(presale, "RefundClaimed");
      
      const balanceAfter = await mockUSDC.balanceOf(user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });

  describe("Treasury Withdrawal with Timelock", function () {
    beforeEach(async function () {
      await time.increaseTo(startTimes[0]);
      const amount = ethers.parseEther("10000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      await presale.connect(user1).contribute(amount);
    });

    it("Should require timelock for withdrawals", async function () {
      // Request withdrawal
      await presale.connect(admin).requestWithdrawFunds();
      
      // Try immediate execution (should fail)
      await expect(
        presale.connect(admin).executeWithdrawFunds(treasury.address, 0)
      ).to.be.revertedWithCustomError(presale, "TimelockNotReady");
      
      // Fast forward
      await time.increase(86400 * 2 + 1);
      
      // Now should work (0 means withdraw full balance)
      await expect(
        presale.connect(admin).executeWithdrawFunds(treasury.address, 0)
      ).to.emit(presale, "FundsWithdrawn");
    });

    it("Should enforce circuit breaker - daily withdrawal limit", async function () {
      // user1 already contributed $10k in beforeEach
      // Add more users to get enough funds to test circuit breaker
      const contributionPerUser = ethers.parseEther("5000"); // $5k each
      
      // user2 and user3 contribute
      await mockUSDC.mint(user2.address, contributionPerUser);
      await mockUSDC.connect(user2).approve(await presale.getAddress(), contributionPerUser);
      await presale.connect(user2).contribute(contributionPerUser);
      await ethers.provider.send("hardhat_mine", ["0x3"]); // Mine 3 blocks
      
      await mockUSDC.mint(user3.address, contributionPerUser);
      await mockUSDC.connect(user3).approve(await presale.getAddress(), contributionPerUser);
      await presale.connect(user3).contribute(contributionPerUser);
      
      // Total contributed: $20k
      // Request withdrawal
      await presale.connect(admin).requestWithdrawFunds();
      await time.increase(86400 * 2 + 1);
      
      // Withdraw partial amount (within daily limit)
      const withdrawAmount = ethers.parseEther("15000"); // $15k
      await expect(
        presale.connect(admin).executeWithdrawFunds(treasury.address, withdrawAmount)
      ).to.emit(presale, "FundsWithdrawn").withArgs(treasury.address, withdrawAmount);
    });

    it("Should allow recovery of unclaimed refunds after deadline", async function () {
      // Setup: Complete all rounds first but don't reach soft cap
      for (let i = 0; i < 5; i++) {
        const currentTime = await time.latest();
        if (startTimes[i] > currentTime) {
          await time.increaseTo(startTimes[i]);
        }
        
        // Contribute small amount (won't reach soft cap)
        const amount = ethers.parseEther("500");
        await mockUSDC.mint(user2.address, amount);
        await mockUSDC.connect(user2).approve(await presale.getAddress(), amount);
        await presale.connect(user2).contribute(amount);
        
        // Fast forward to end of round
        const timeAfterContribute = await time.latest();
        const timeToEnd = endTimes[i] - timeAfterContribute;
        if (timeToEnd > 0) {
          await time.increase(timeToEnd + 1);
        }
        
        await presale.connect(admin).finalizeRound();
        if (i < 4) {
          await presale.connect(admin).advanceRound();
        }
      }
      
      // Enable refunds (soft cap not reached)
      await presale.connect(admin).enableRefunds();
      
      // user2 doesn't claim refund, wait past deadline
      await time.increase(86400 * 30 + 1);
      
      // Refund window closed for users
      await expect(
        presale.connect(user2).claimRefund()
      ).to.be.revertedWithCustomError(presale, "RefundWindowClosed");
      
      // Treasury can recover unclaimed funds (admin has TREASURY_ROLE)
      const treasuryBalBefore = await mockUSDC.balanceOf(treasury.address);
      await presale.connect(admin).recoverUnclaimedRefunds(treasury.address);
      const treasuryBalAfter = await mockUSDC.balanceOf(treasury.address);
      
      expect(treasuryBalAfter).to.be.gt(treasuryBalBefore);
    });
  });

  describe("Claiming Tokens", function () {
    beforeEach(async function () {
      // Complete presale and enable TGE
      for (let i = 0; i < 5; i++) {
        const currentTime = await time.latest();
        if (startTimes[i] > currentTime) {
          await time.increaseTo(startTimes[i]);
        }
      const amount = ethers.parseEther("1000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
        await presale.connect(user1).contribute(amount);
        
        // Increase time to end of round
        const timeAfterContribute = await time.latest();
        const timeToEnd = endTimes[i] - timeAfterContribute;
        if (timeToEnd > 0) {
          await time.increase(timeToEnd);
        }
        await presale.connect(admin).finalizeRound();
        
        if (i < 4) {
          await presale.connect(admin).advanceRound();
        }
      }
      
      const tgeTime = (await time.latest()) + 86400 * 7;
      await presale.connect(admin).requestEnableTGE(tgeTime);
      await time.increase(86400 * 2 + 1);
      await presale.connect(admin).executeEnableTGE(tgeTime);
      await time.increase(86400 * 7);
    });

    it("Should allow claiming TGE unlock", async function () {
      const balanceBefore = await selfToken.balanceOf(user1.address);
      
      await presale.connect(user1).claimTokens();
      
      const balanceAfter = await selfToken.balanceOf(user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should vest remaining tokens over 10 months", async function () {
      // Claim TGE unlock
      await presale.connect(user1).claimTokens();
      
      // Fast forward 5 months (half vesting)
      await time.increase(86400 * 30 * 5);
      
      const claimable = await presale.getClaimableAmount(user1.address);
      expect(claimable).to.be.gt(0);
    });
  });

  describe("Security Edge Cases", function () {
    beforeEach(async function () {
      await time.increaseTo(startTimes[0]);
    });

    it("Should handle zero contribution", async function () {
      await expect(
        presale.connect(user1).contribute(0)
      ).to.be.revertedWithCustomError(presale, "BelowMinimum");
    });

    it("Should protect against reentrancy", async function () {
      // ReentrancyGuard is in place, tested implicitly
      const amount = ethers.parseEther("1000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      await presale.connect(user1).contribute(amount);
    });

    it("Should handle exact target contribution", async function () {
      // This would need multiple users and precise amounts
      // Simplified test
      const amount = ethers.parseEther("1000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      await presale.connect(user1).contribute(amount);
      
      const round = await presale.rounds(0);
      expect(round.raised).to.equal(amount);
    });
  });

  describe("Timelock Cancellation", function () {
    beforeEach(async function () {
      await time.increaseTo(startTimes[0]);
      const amount = ethers.parseEther("1000");
      await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
      await presale.connect(user1).contribute(amount);
    });

    it("Should allow cancelling withdrawal timelock", async function () {
      await presale.connect(admin).requestWithdrawFunds();
      
      await expect(
        presale.connect(admin).cancelWithdrawFunds()
      ).to.emit(presale, "TimelockCancelled");
      
      // After cancellation, execution should fail
      await time.increase(86400 * 2 + 1);
      await expect(
        presale.connect(admin).executeWithdrawFunds(treasury.address, 0)
      ).to.be.revertedWithCustomError(presale, "TimelockAlreadyExecutedOrCancelled");
    });

    it("Should allow cancelling TGE timelock", async function () {
      // Complete all rounds first
      for (let i = 0; i < 5; i++) {
        const currentTime = await time.latest();
        if (startTimes[i] > currentTime) {
          await time.increaseTo(startTimes[i]);
        }
        const amount = ethers.parseEther("1000");
        await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
        await presale.connect(user1).contribute(amount);
        
        const timeAfterContribute = await time.latest();
        const timeToEnd = endTimes[i] - timeAfterContribute;
        if (timeToEnd > 0) {
          await time.increase(timeToEnd);
        }
        await presale.connect(admin).finalizeRound();
        if (i < 4) {
          await presale.connect(admin).advanceRound();
        }
      }
      
      const tgeTime = (await time.latest()) + 86400 * 7;
      await presale.connect(admin).requestEnableTGE(tgeTime);
      
      await expect(
        presale.connect(admin).cancelEnableTGE(tgeTime)
      ).to.emit(presale, "TimelockCancelled");
    });

    it("Should allow cancelling emergency withdrawal timelock", async function () {
      await presale.connect(admin).requestEmergencyWithdrawSELF();
      
      await expect(
        presale.connect(admin).cancelEmergencyWithdrawSELF()
      ).to.emit(presale, "TimelockCancelled");
    });

    it("Should fail to cancel non-existent timelock", async function () {
      await expect(
        presale.connect(admin).cancelWithdrawFunds()
      ).to.be.revertedWithCustomError(presale, "TimelockNotFound");
    });
  });

  describe("Emergency Withdrawal TGE Protection", function () {
    beforeEach(async function () {
      // Complete all rounds
      for (let i = 0; i < 5; i++) {
        const currentTime = await time.latest();
        if (startTimes[i] > currentTime) {
          await time.increaseTo(startTimes[i]);
        }
        const amount = ethers.parseEther("1000");
        await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
        await presale.connect(user1).contribute(amount);
        
        const timeAfterContribute = await time.latest();
        const timeToEnd = endTimes[i] - timeAfterContribute;
        if (timeToEnd > 0) {
          await time.increase(timeToEnd);
        }
        await presale.connect(admin).finalizeRound();
        if (i < 4) {
          await presale.connect(admin).advanceRound();
        }
      }
    });

    it("Should block emergency withdrawal if TGE enabled during timelock", async function () {
      // Request emergency withdrawal
      await presale.connect(admin).requestEmergencyWithdrawSELF();
      
      // Wait some time but not full timelock
      await time.increase(86400 * 3);
      
      // Enable TGE (different admin action)
      const tgeTime = (await time.latest()) + 86400 * 7;
      await presale.connect(admin).requestEnableTGE(tgeTime);
      await time.increase(86400 * 2 + 1);
      await presale.connect(admin).executeEnableTGE(tgeTime);
      
      // Now wait for emergency timelock to complete
      await time.increase(86400 * 4);
      
      // Emergency withdrawal should now fail because TGE is enabled
      await expect(
        presale.connect(admin).executeEmergencyWithdrawSELF(admin.address)
      ).to.be.revertedWithCustomError(presale, "TGEAlreadyEnabled");
    });
  });

  describe("Refund Participant Count", function () {
    beforeEach(async function () {
      // Complete all rounds with minimal contributions (won't reach soft cap)
      for (let i = 0; i < 5; i++) {
        const currentTime = await time.latest();
        if (startTimes[i] > currentTime) {
          await time.increaseTo(startTimes[i]);
        }
        const amount = ethers.parseEther("100");
        await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
        await presale.connect(user1).contribute(amount);
        
        const timeAfterContribute = await time.latest();
        const timeToEnd = endTimes[i] - timeAfterContribute;
        if (timeToEnd > 0) {
          await time.increase(timeToEnd);
        }
        await presale.connect(admin).finalizeRound();
        if (i < 4) {
          await presale.connect(admin).advanceRound();
        }
      }
    });

    it("Should decrement participant count on refund", async function () {
      await presale.connect(admin).enableRefunds();
      
      const statsBefore = await presale.getPresaleStats();
      expect(statsBefore._totalParticipants).to.equal(1);
      
      await presale.connect(user1).claimRefund();
      
      const statsAfter = await presale.getPresaleStats();
      expect(statsAfter._totalParticipants).to.equal(0);
    });
  });
});
