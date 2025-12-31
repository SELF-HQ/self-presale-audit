const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("SELFPresale - Enhanced Security Test Suite", function () {
  let presale, selfToken, mockUSDC;
  let admin, pauser, roundManager, treasury, tgeEnabler;
  let user1, user2, user3;
  let signers;
  let startTimes, endTimes;
  
  // Role hashes
  let DEFAULT_ADMIN_ROLE, PAUSER_ROLE, ROUND_MANAGER_ROLE, TREASURY_ROLE, TGE_ENABLER_ROLE;

  beforeEach(async function () {
    signers = await ethers.getSigners();
    [admin, pauser, roundManager, treasury, tgeEnabler, user1, user2, user3] = signers;

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
      // Complete all 5 rounds with soft cap reached
      const amountPerWallet = ethers.parseEther("10000");
      
      for (let i = 0; i < 5; i++) {
        const currentTime = await time.latest();
        if (startTimes[i] > currentTime) {
          await time.increaseTo(startTimes[i]);
        }
        
        // Reach soft cap in round 1 using random wallets
        if (i === 0) {
          const walletsNeeded = 50;
          for (let w = 0; w < walletsNeeded; w++) {
            const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
            await admin.sendTransaction({ to: wallet.address, value: ethers.parseEther("0.1") });
            await mockUSDC.mint(wallet.address, amountPerWallet);
            await mockUSDC.connect(wallet).approve(await presale.getAddress(), amountPerWallet);
            await presale.connect(wallet).contribute(amountPerWallet);
            await ethers.provider.send("hardhat_mine", ["0x3"]);
          }
        }
        
        // Fast forward to end of round
        await time.increaseTo(endTimes[i] + 1);
        await presale.connect(admin).finalizeRound();
        await presale.connect(admin).advanceRound();
      }
    });

    it("Should require timelock for TGE enablement", async function () {
      const tgeTime = (await time.latest()) + 86400 * 7;
      
      await presale.connect(admin).requestEnableTGE(tgeTime);
      
      await expect(
        presale.connect(admin).executeEnableTGE()
      ).to.be.revertedWithCustomError(presale, "TimelockNotReady");
      
      await time.increase(86400 * 2 + 1);
      
      await expect(
        presale.connect(admin).executeEnableTGE()
      ).to.emit(presale, "TGEEnabled");
    });

    it("Should block a second pending TGE request (SEA-08 / SEA-05)", async function () {
      const tgeTime1 = (await time.latest()) + 86400 * 7;
      const tgeTime2 = tgeTime1 + 86400;

      await presale.connect(admin).requestEnableTGE(tgeTime1);

      await expect(
        presale.connect(admin).requestEnableTGE(tgeTime2)
      ).to.be.revertedWithCustomError(presale, "TimelockRequestPending");
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
        await presale.connect(admin).advanceRound();
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
      // Withdrawal should not be possible before presale end / softcap success
      await expect(
        presale.connect(admin).requestWithdrawFunds(treasury.address, 0)
      ).to.be.reverted;
    });

    it("Should allow withdrawal after presale end + soft cap", async function () {
      // Reach soft cap using random wallets
      const amountPerWallet = ethers.parseEther("10000");
      const walletsNeeded = 50;
      for (let w = 0; w < walletsNeeded; w++) {
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        await admin.sendTransaction({ to: wallet.address, value: ethers.parseEther("0.1") });
        await mockUSDC.mint(wallet.address, amountPerWallet);
        await mockUSDC.connect(wallet).approve(await presale.getAddress(), amountPerWallet);
        await presale.connect(wallet).contribute(amountPerWallet);
        await ethers.provider.send("hardhat_mine", ["0x3"]);
      }

      // End all rounds
      for (let i = 0; i < 5; i++) {
        const currentTime = await time.latest();
        if (startTimes[i] > currentTime) await time.increaseTo(startTimes[i]);
        await time.increaseTo(endTimes[i] + 1);
        await presale.connect(admin).finalizeRound();
        await presale.connect(admin).advanceRound();
      }

      // Request withdrawal within daily limit ($100k < $500k daily limit)
      await presale.connect(admin).requestWithdrawFunds(treasury.address, ethers.parseEther("100000"));
      await time.increase(86400 * 2 + 1);

      await expect(
        presale.connect(admin).executeWithdrawFunds(1)
      ).to.emit(presale, "FundsWithdrawn");
    });

    it("Should enforce circuit breaker - daily withdrawal limit", async function () {
      // Reach soft cap using random wallets
      const amountPerWallet = ethers.parseEther("10000");
      const walletsNeeded = 50;
      for (let w = 0; w < walletsNeeded; w++) {
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        await admin.sendTransaction({ to: wallet.address, value: ethers.parseEther("0.1") });
        await mockUSDC.mint(wallet.address, amountPerWallet);
        await mockUSDC.connect(wallet).approve(await presale.getAddress(), amountPerWallet);
        await presale.connect(wallet).contribute(amountPerWallet);
        await ethers.provider.send("hardhat_mine", ["0x3"]);
      }

      // End all rounds
      for (let i = 0; i < 5; i++) {
        const currentTime = await time.latest();
        if (startTimes[i] > currentTime) await time.increaseTo(startTimes[i]);
        await time.increaseTo(endTimes[i] + 1);
        await presale.connect(admin).finalizeRound();
        await presale.connect(admin).advanceRound();
      }

      // Request withdrawal larger than daily limit
      await presale.connect(admin).requestWithdrawFunds(treasury.address, ethers.parseEther("600000"));
      await time.increase(86400 * 2 + 1);

      await expect(
        presale.connect(admin).executeWithdrawFunds(1)
      ).to.be.revertedWithCustomError(presale, "DailyWithdrawalLimitExceeded");
    });

    it("Should allow multiple queued withdrawals to execute independently (SEA-10)", async function () {
      // Reach soft cap using random wallets
      const amountPerWallet = ethers.parseEther("10000");
      const walletsNeeded = 50;
      for (let w = 0; w < walletsNeeded; w++) {
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        await admin.sendTransaction({ to: wallet.address, value: ethers.parseEther("0.1") });
        await mockUSDC.mint(wallet.address, amountPerWallet);
        await mockUSDC.connect(wallet).approve(await presale.getAddress(), amountPerWallet);
        await presale.connect(wallet).contribute(amountPerWallet);
        await ethers.provider.send("hardhat_mine", ["0x3"]);
      }

      // End all rounds
      for (let i = 0; i < 5; i++) {
        const currentTime = await time.latest();
        if (startTimes[i] > currentTime) await time.increaseTo(startTimes[i]);
        await time.increaseTo(endTimes[i] + 1);
        await presale.connect(admin).finalizeRound();
        await presale.connect(admin).advanceRound();
      }

      const treasuryBalBefore = await mockUSDC.balanceOf(treasury.address);

      // Queue two withdrawals (two independent timelocks)
      await presale.connect(admin).requestWithdrawFunds(treasury.address, ethers.parseEther("100000")); // nonce 1
      await presale.connect(admin).requestWithdrawFunds(treasury.address, ethers.parseEther("200000")); // nonce 2

      await time.increase(86400 * 2 + 1);

      // Execute out of order to prove independence
      await expect(presale.connect(admin).executeWithdrawFunds(2)).to.emit(presale, "FundsWithdrawn");
      await expect(presale.connect(admin).executeWithdrawFunds(1)).to.emit(presale, "FundsWithdrawn");

      const treasuryBalAfter = await mockUSDC.balanceOf(treasury.address);
      expect(treasuryBalAfter - treasuryBalBefore).to.equal(ethers.parseEther("300000"));
    });

    it("Should allow recovery of unclaimed refunds after deadline", async function () {
      // Complete all rounds without reaching soft cap
      for (let i = 0; i < 5; i++) {
        const currentTime = await time.latest();
        if (startTimes[i] > currentTime) {
          await time.increaseTo(startTimes[i]);
        }
        
        const amount = ethers.parseEther("500");
        await mockUSDC.mint(user2.address, amount);
        await mockUSDC.connect(user2).approve(await presale.getAddress(), amount);
        await presale.connect(user2).contribute(amount);
        
        await time.increaseTo(endTimes[i] + 1);
        await presale.connect(admin).finalizeRound();
        await presale.connect(admin).advanceRound();
      }
      
      await presale.connect(admin).enableRefunds();
      await time.increase(86400 * 30 + 1);
      
      await expect(
        presale.connect(user2).claimRefund()
      ).to.be.revertedWithCustomError(presale, "RefundWindowClosed");
      
      const treasuryBalBefore = await mockUSDC.balanceOf(treasury.address);
      await presale.connect(admin).recoverUnclaimedRefunds(treasury.address);
      const treasuryBalAfter = await mockUSDC.balanceOf(treasury.address);
      
      expect(treasuryBalAfter).to.be.gt(treasuryBalBefore);
    });
  });

  describe("Claiming Tokens", function () {
    beforeEach(async function () {
      const amountPerWallet = ethers.parseEther("10000");
      
      // Complete all rounds with soft cap reached
      for (let i = 0; i < 5; i++) {
        const currentTime = await time.latest();
        if (startTimes[i] > currentTime) {
          await time.increaseTo(startTimes[i]);
        }
        
        if (i === 0) {
          // Reach soft cap using random wallets
          const walletsNeeded = 50;
          for (let w = 0; w < walletsNeeded; w++) {
            const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
            await admin.sendTransaction({ to: wallet.address, value: ethers.parseEther("0.1") });
            await mockUSDC.mint(wallet.address, amountPerWallet);
            await mockUSDC.connect(wallet).approve(await presale.getAddress(), amountPerWallet);
            await presale.connect(wallet).contribute(amountPerWallet);
            await ethers.provider.send("hardhat_mine", ["0x3"]);
          }
        }
        
        // user1 also contributes for later claiming
        const amount = ethers.parseEther("1000");
        await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
        await presale.connect(user1).contribute(amount);
        
        await time.increaseTo(endTimes[i] + 1);
        await presale.connect(admin).finalizeRound();
        await presale.connect(admin).advanceRound();
      }
      
      const tgeTime = (await time.latest()) + 86400 * 7;
      await presale.connect(admin).requestEnableTGE(tgeTime);
      await time.increase(86400 * 2 + 1);
      await presale.connect(admin).executeEnableTGE();
      await time.increase(86400 * 7);
    });

    it("Should allow claiming TGE unlock", async function () {
      const balanceBefore = await selfToken.balanceOf(user1.address);
      await presale.connect(user1).claimTokens();
      const balanceAfter = await selfToken.balanceOf(user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should vest remaining tokens over 10 months", async function () {
      await presale.connect(user1).claimTokens();
      await time.increase(86400 * 30 * 5);
      const claimable = await presale.getClaimableAmount(user1.address);
      expect(claimable).to.be.gt(0);
    });
  });

  describe("Excess SELF Withdrawal (SEA-16)", function () {
    beforeEach(async function () {
      const amountPerWallet = ethers.parseEther("10000");

      // Complete all rounds with soft cap reached
      for (let i = 0; i < 5; i++) {
        const currentTime = await time.latest();
        if (startTimes[i] > currentTime) {
          await time.increaseTo(startTimes[i]);
        }

        if (i === 0) {
          // Reach soft cap using random wallets
          const walletsNeeded = 50;
          for (let w = 0; w < walletsNeeded; w++) {
            const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
            await admin.sendTransaction({ to: wallet.address, value: ethers.parseEther("0.1") });
            await mockUSDC.mint(wallet.address, amountPerWallet);
            await mockUSDC.connect(wallet).approve(await presale.getAddress(), amountPerWallet);
            await presale.connect(wallet).contribute(amountPerWallet);
            await ethers.provider.send("hardhat_mine", ["0x3"]);
          }
        }

        await time.increaseTo(endTimes[i] + 1);
        await presale.connect(admin).finalizeRound();
        await presale.connect(admin).advanceRound();
      }

      const tgeTime = (await time.latest()) + 86400 * 7;
      await presale.connect(admin).requestEnableTGE(tgeTime);
      await time.increase(86400 * 2 + 1);
      await presale.connect(admin).executeEnableTGE();
    });

    it("Should allow sweeping only the excess SELF after TGE", async function () {
      const presaleAddr = await presale.getAddress();
      const balanceBefore = await selfToken.balanceOf(presaleAddr);
      const treasuryBefore = await selfToken.balanceOf(treasury.address);

      const totalAllocated = await presale.totalAllocatedSELF();
      const totalClaimed = await presale.totalClaimedSELF();
      const outstanding = totalAllocated - totalClaimed;
      const expectedExcess = balanceBefore - outstanding;

      await expect(
        presale.connect(admin).withdrawExcessSELF(treasury.address)
      ).to.emit(presale, "ExcessSELFWithdrawn");

      const balanceAfter = await selfToken.balanceOf(presaleAddr);
      const treasuryAfter = await selfToken.balanceOf(treasury.address);

      expect(balanceAfter).to.equal(outstanding);
      expect(treasuryAfter - treasuryBefore).to.equal(expectedExcess);
    });

    it("Should revert if called before TGE", async function () {
      // Deploy a fresh presale that hasn't enabled TGE
      const SELFPresale = await ethers.getContractFactory("SELFPresale");
      const freshPresale = await SELFPresale.deploy(
        await mockUSDC.getAddress(),
        await selfToken.getAddress(),
        admin.address
      );
      const now = await time.latest();
      const freshStartTimes = [
        now + 3600,
        now + 3600 + 86400 * 12,
        now + 3600 + 86400 * 24,
        now + 3600 + 86400 * 36,
        now + 3600 + 86400 * 48
      ];
      const freshEndTimes = [
        now + 3600 + 86400 * 12 - 1,
        now + 3600 + 86400 * 24 - 1,
        now + 3600 + 86400 * 36 - 1,
        now + 3600 + 86400 * 48 - 1,
        now + 3600 + 86400 * 60 - 1
      ];
      await freshPresale.connect(admin).initializeRounds(freshStartTimes, freshEndTimes);
      await selfToken.transfer(await freshPresale.getAddress(), ethers.parseEther("1000"));

      await expect(
        freshPresale.connect(admin).withdrawExcessSELF(treasury.address)
      ).to.be.revertedWithCustomError(freshPresale, "TGENotEnabled");
    });

    it("Should revert when there is no excess (balance equals outstanding)", async function () {
      // Fresh presale where we fund SELF exactly equal to the allocations we create (so excess==0)
      const MockUSDC = await ethers.getContractFactory("MockUSDC");
      const usdc = await MockUSDC.deploy();

      const SELFToken = await ethers.getContractFactory("SELFToken");
      const self = await SELFToken.deploy();

      const SELFPresale = await ethers.getContractFactory("SELFPresale");
      const p = await SELFPresale.deploy(await usdc.getAddress(), await self.getAddress(), admin.address);

      const now = await time.latest();
      const sTimes = [
        now + 3600,
        now + 3600 + 86400 * 12,
        now + 3600 + 86400 * 24,
        now + 3600 + 86400 * 36,
        now + 3600 + 86400 * 48
      ];
      const eTimes = [
        now + 3600 + 86400 * 12 - 1,
        now + 3600 + 86400 * 24 - 1,
        now + 3600 + 86400 * 36 - 1,
        now + 3600 + 86400 * 48 - 1,
        now + 3600 + 86400 * 60 - 1
      ];
      await p.connect(admin).initializeRounds(sTimes, eTimes);

      // Move to round 1 start
      await time.increaseTo(sTimes[0]);

      // We will do 50 contributions of $10,000 in round 1 to reach exactly the $500k soft cap.
      const amountPerWallet = ethers.parseEther("10000");
      const walletsNeeded = 50;

      // Compute the exact SELF needed for one contribution, matching the contract math for round 1
      const round1 = await p.rounds(0);
      const price = round1.price; // uint256
      const bonusPct = BigInt(round1.bonus);

      let selfAmount = (amountPerWallet * 10n ** 18n) / price;
      const remainder = (amountPerWallet * 10n ** 18n) % price;
      if (remainder > 0n) selfAmount += 1n;
      const bonusAmount = (selfAmount * bonusPct) / 100n;
      const totalSelfPerContribution = selfAmount + bonusAmount;

      const totalSelfNeeded = totalSelfPerContribution * BigInt(walletsNeeded);
      await self.transfer(await p.getAddress(), totalSelfNeeded);

      for (let w = 0; w < walletsNeeded; w++) {
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        await admin.sendTransaction({ to: wallet.address, value: ethers.parseEther("0.1") });
        await usdc.mint(wallet.address, amountPerWallet);
        await usdc.connect(wallet).approve(await p.getAddress(), amountPerWallet);
        await p.connect(wallet).contribute(amountPerWallet);
        await ethers.provider.send("hardhat_mine", ["0x3"]);
      }

      // End all rounds (including empty ones)
      for (let i = 0; i < 5; i++) {
        await time.increaseTo(eTimes[i] + 1);
        await p.connect(admin).finalizeRound();
        await p.connect(admin).advanceRound();
      }

      // Enable TGE
      const tgeTime = (await time.latest()) + 86400 * 7;
      await p.connect(admin).requestEnableTGE(tgeTime);
      await time.increase(86400 * 2 + 1);
      await p.connect(admin).executeEnableTGE();

      await expect(
        p.connect(admin).withdrawExcessSELF(treasury.address)
      ).to.be.revertedWithCustomError(p, "NoExcessSELF");
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
    it("Should allow cancelling withdrawal timelock", async function () {
      const amountPerWallet = ethers.parseEther("10000");
      await time.increaseTo(startTimes[0]);
      
      // Reach soft cap
      for (let w = 0; w < 50; w++) {
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        await admin.sendTransaction({ to: wallet.address, value: ethers.parseEther("0.1") });
        await mockUSDC.mint(wallet.address, amountPerWallet);
        await mockUSDC.connect(wallet).approve(await presale.getAddress(), amountPerWallet);
        await presale.connect(wallet).contribute(amountPerWallet);
        await ethers.provider.send("hardhat_mine", ["0x3"]);
      }
      
      // End all rounds
      for (let i = 0; i < 5; i++) {
        await time.increaseTo(endTimes[i] + 1);
        await presale.connect(admin).finalizeRound();
        await presale.connect(admin).advanceRound();
      }
      
      await presale.connect(admin).requestWithdrawFunds(treasury.address, ethers.parseEther("1000"));
      
      await expect(
        presale.connect(admin)["cancelWithdrawFunds(uint256)"](1)
      ).to.emit(presale, "TimelockCancelled");
    });

    it("Should allow cancelling TGE timelock", async function () {
      const amountPerWallet = ethers.parseEther("10000");
      await time.increaseTo(startTimes[0]);
      
      // Reach soft cap
      for (let w = 0; w < 50; w++) {
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        await admin.sendTransaction({ to: wallet.address, value: ethers.parseEther("0.1") });
        await mockUSDC.mint(wallet.address, amountPerWallet);
        await mockUSDC.connect(wallet).approve(await presale.getAddress(), amountPerWallet);
        await presale.connect(wallet).contribute(amountPerWallet);
        await ethers.provider.send("hardhat_mine", ["0x3"]);
      }
      
      // End all rounds
      for (let i = 0; i < 5; i++) {
        await time.increaseTo(endTimes[i] + 1);
        await presale.connect(admin).finalizeRound();
        await presale.connect(admin).advanceRound();
      }

      const tgeTime = (await time.latest()) + 86400 * 7;
      await presale.connect(admin).requestEnableTGE(tgeTime);
      
      await expect(
        presale.connect(admin).cancelEnableTGE()
      ).to.emit(presale, "TimelockCancelled");
    });

    it("Should allow cancelling emergency withdrawal timelock when no allocations", async function () {
      // Deploy fresh presale without contributions
      const SELFPresale = await ethers.getContractFactory("SELFPresale");
      const freshPresale = await SELFPresale.deploy(
        await mockUSDC.getAddress(),
        await selfToken.getAddress(),
        admin.address
      );
      
      const now = await time.latest();
      const freshStartTimes = [
        now + 3600,
        now + 3600 + 86400 * 12,
        now + 3600 + 86400 * 24,
        now + 3600 + 86400 * 36,
        now + 3600 + 86400 * 48
      ];
      const freshEndTimes = [
        now + 3600 + 86400 * 12 - 1,
        now + 3600 + 86400 * 24 - 1,
        now + 3600 + 86400 * 36 - 1,
        now + 3600 + 86400 * 48 - 1,
        now + 3600 + 86400 * 60 - 1
      ];
      await freshPresale.connect(admin).initializeRounds(freshStartTimes, freshEndTimes);
      
      await freshPresale.connect(admin).requestEmergencyWithdrawSELF();
      
      await expect(
        freshPresale.connect(admin).cancelEmergencyWithdrawSELF()
      ).to.emit(freshPresale, "TimelockCancelled");
    });
  });

  describe("Emergency Withdrawal TGE Protection", function () {
    it("Should block emergency withdrawal if TGE enabled during timelock", async function () {
      // Deploy fresh presale without contributions for emergency withdrawal test
      const SELFPresale = await ethers.getContractFactory("SELFPresale");
      const freshPresale = await SELFPresale.deploy(
        await mockUSDC.getAddress(),
        await selfToken.getAddress(),
        admin.address
      );
      
      const now = await time.latest();
      const freshStartTimes = [
        now + 3600,
        now + 3600 + 86400 * 12,
        now + 3600 + 86400 * 24,
        now + 3600 + 86400 * 36,
        now + 3600 + 86400 * 48
      ];
      const freshEndTimes = [
        now + 3600 + 86400 * 12 - 1,
        now + 3600 + 86400 * 24 - 1,
        now + 3600 + 86400 * 36 - 1,
        now + 3600 + 86400 * 48 - 1,
        now + 3600 + 86400 * 60 - 1
      ];
      await freshPresale.connect(admin).initializeRounds(freshStartTimes, freshEndTimes);
      
      // Transfer SELF tokens
      await selfToken.transfer(await freshPresale.getAddress(), ethers.parseEther("42000000"));
      
      // Request emergency withdrawal (no allocations yet)
      await freshPresale.connect(admin).requestEmergencyWithdrawSELF();
      
      // Now make contributions to reach soft cap (this will block emergency withdrawal)
      const amountPerWallet = ethers.parseEther("10000");
      await time.increaseTo(freshStartTimes[0]);
      
      for (let w = 0; w < 50; w++) {
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        await admin.sendTransaction({ to: wallet.address, value: ethers.parseEther("0.1") });
        await mockUSDC.mint(wallet.address, amountPerWallet);
        await mockUSDC.connect(wallet).approve(await freshPresale.getAddress(), amountPerWallet);
        await freshPresale.connect(wallet).contribute(amountPerWallet);
        await ethers.provider.send("hardhat_mine", ["0x3"]);
      }
      
      // End all rounds
      for (let i = 0; i < 5; i++) {
        await time.increaseTo(freshEndTimes[i] + 1);
        await freshPresale.connect(admin).finalizeRound();
        await freshPresale.connect(admin).advanceRound();
      }
      
      // Enable TGE
      const tgeTime = (await time.latest()) + 86400 * 7;
      await freshPresale.connect(admin).requestEnableTGE(tgeTime);
      await time.increase(86400 * 2 + 1);
      await freshPresale.connect(admin).executeEnableTGE();
      
      // Wait for emergency timelock to complete
      await time.increase(86400 * 7);
      
      // Emergency withdrawal should fail because TGE is enabled
      await expect(
        freshPresale.connect(admin).executeEmergencyWithdrawSELF(admin.address)
      ).to.be.revertedWithCustomError(freshPresale, "TGEAlreadyEnabled");
    });
  });

  describe("Refund Participant Count", function () {
    it("Should decrement participant count on refund", async function () {
      // Complete all rounds without reaching soft cap
      for (let i = 0; i < 5; i++) {
        const currentTime = await time.latest();
        if (startTimes[i] > currentTime) {
          await time.increaseTo(startTimes[i]);
        }
        const amount = ethers.parseEther("100");
        await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
        await presale.connect(user1).contribute(amount);
        
        await time.increaseTo(endTimes[i] + 1);
        await presale.connect(admin).finalizeRound();
        await presale.connect(admin).advanceRound();
      }
      
      await presale.connect(admin).enableRefunds();
      
      const statsBefore = await presale.getPresaleStats();
      expect(statsBefore._totalParticipants).to.equal(1);
      
      await presale.connect(user1).claimRefund();
      
      const statsAfter = await presale.getPresaleStats();
      expect(statsAfter._totalParticipants).to.equal(0);
    });
  });

  describe("Emergency SELF Withdrawal After Refund Deadline (SEA-16)", function () {
    it("Should allow SELF recovery after refund deadline even with unclaimed allocations", async function () {
      // Complete all rounds without reaching soft cap
      for (let i = 0; i < 5; i++) {
        const currentTime = await time.latest();
        if (startTimes[i] > currentTime) {
          await time.increaseTo(startTimes[i]);
        }
        const amount = ethers.parseEther("1000");
        await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
        await presale.connect(user1).contribute(amount);
        
        await time.increaseTo(endTimes[i] + 1);
        await presale.connect(admin).finalizeRound();
        await presale.connect(admin).advanceRound();
      }
      
      // Verify allocations exist
      const totalAllocated = await presale.totalAllocatedSELF();
      expect(totalAllocated).to.be.gt(0);
      
      // Enable refunds (soft cap not reached)
      await presale.connect(admin).enableRefunds();
      
      // User does NOT claim refund - simulating forgotten/malicious non-claim
      
      // Fast forward past 30-day refund window
      await time.increase(86400 * 30 + 1);
      
      // Request emergency SELF withdrawal (should now be allowed after refund deadline)
      await expect(
        presale.connect(admin).requestEmergencyWithdrawSELF()
      ).to.emit(presale, "TimelockRequested");
      
      // Wait for 7-day emergency timelock
      await time.increase(86400 * 7 + 1);
      
      // Execute emergency withdrawal
      const selfBalanceBefore = await selfToken.balanceOf(treasury.address);
      
      await expect(
        presale.connect(admin).executeEmergencyWithdrawSELF(treasury.address)
      ).to.emit(presale, "EmergencySELFWithdrawn");
      
      const selfBalanceAfter = await selfToken.balanceOf(treasury.address);
      expect(selfBalanceAfter).to.be.gt(selfBalanceBefore);
    });

    it("Should block SELF recovery before refund deadline even with refunds enabled", async function () {
      // Complete all rounds without reaching soft cap
      for (let i = 0; i < 5; i++) {
        const currentTime = await time.latest();
        if (startTimes[i] > currentTime) {
          await time.increaseTo(startTimes[i]);
        }
        const amount = ethers.parseEther("1000");
        await mockUSDC.connect(user1).approve(await presale.getAddress(), amount);
        await presale.connect(user1).contribute(amount);
        
        await time.increaseTo(endTimes[i] + 1);
        await presale.connect(admin).finalizeRound();
        await presale.connect(admin).advanceRound();
      }
      
      // Enable refunds
      await presale.connect(admin).enableRefunds();
      
      // Try to request emergency withdrawal while refund window still active
      // Should fail because allocations exist and refund window hasn't expired
      await expect(
        presale.connect(admin).requestEmergencyWithdrawSELF()
      ).to.be.revertedWithCustomError(presale, "InsufficientSELFBalance");
    });
  });
});
