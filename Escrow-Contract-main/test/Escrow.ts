import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { parseUnits } from "ethers/lib/utils";

describe("Escrow", function () {
  async function deployEscrowFixture() {
    const price = 10000000000;
    const feePercentage = parseUnits("5", 3);
    const rodoBalance = parseUnits("100000");
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, feeReceiver, admin] = await ethers.getSigners();
    const TestToken = await ethers.getContractFactory("TestToken");
    const testToken = await TestToken.deploy();
    const Escrow = await ethers.getContractFactory("Escrow");
    const escrow = await Escrow.deploy(
      testToken.address,
      price,
      feePercentage,
      admin.address,
      feeReceiver.address
    );
    await testToken.transfer(escrow.address, rodoBalance);
    return {
      escrow,
      price,
      feePercentage,
      testToken,
      owner,
      otherAccount,
      admin,
      feeReceiver,
      rodoBalance,
    };
  }

  describe("Deployment", function () {
    it("Should set the right price", async function () {
      const { escrow, price } = await loadFixture(deployEscrowFixture);

      expect(await escrow.price()).to.equal(price);
    });

    it("Should set the right owner", async function () {
      const { escrow, owner } = await loadFixture(deployEscrowFixture);

      expect(await escrow.owner()).to.equal(owner.address);
    });

    it("Should set the right fee percentage", async function () {
      const { escrow, feePercentage } = await loadFixture(deployEscrowFixture);

      expect(await escrow.feePercentage()).to.equal(feePercentage);
    });

    it("Should set the right admins", async function () {
      const { escrow, feeReceiver, admin } = await loadFixture(
        deployEscrowFixture
      );

      expect(await escrow.feeReceiver()).to.equal(feeReceiver.address);
      expect(await escrow.admin()).to.equal(admin.address);
    });

    it("Should set the right rodo address", async function () {
      const { escrow, testToken } = await loadFixture(deployEscrowFixture);
      expect(await escrow.rodo()).to.equal(testToken.address);
    });

    it("Should have the right rodo balance", async function () {
      const { escrow, testToken, rodoBalance } = await loadFixture(
        deployEscrowFixture
      );
      expect(await testToken.balanceOf(escrow.address)).to.equal(rodoBalance);
    });
  });

  describe("Buy", function () {
    it("should not allow to buy more than 50% of tokens", async () => {
      const { escrow, testToken, owner, rodoBalance } = await loadFixture(
        deployEscrowFixture
      );
      await expect(escrow.buy(rodoBalance, owner.address)).revertedWith(
        "Escrow: Cannot buy more that 50%"
      );
    });

    it("should not allow low price", async () => {
      const { escrow, testToken, owner, rodoBalance, price, feePercentage } =
        await loadFixture(deployEscrowFixture);
      await expect(escrow.buy(rodoBalance.div(2), owner.address)).revertedWith(
        "Escrow: low price"
      );
    });

    it("should allow to buy ", async () => {
      const {
        escrow,
        otherAccount,
        testToken,
        owner,
        rodoBalance,
        price,
        feePercentage,
        feeReceiver,
        admin,
      } = await loadFixture(deployEscrowFixture);

      const tokensPrice = Number(rodoBalance.div(2).mul(price)) / 1e18;
      const fee = Number(tokensPrice * Number(feePercentage)) / 1e5;
      const requiredEth = tokensPrice + fee;
      await expect(
        escrow.buy(rodoBalance.div(2), otherAccount.address, {
          value: requiredEth,
        })
      )
        .to.changeEtherBalances(
          [feeReceiver.address, admin.address, owner.address],
          [fee, tokensPrice, -requiredEth]
        )
        .to.changeTokenBalances(
          testToken,
          [
            escrow.address,
            otherAccount.address,
            admin.address,
            feeReceiver.address,
          ],
          [
            `-${rodoBalance.toString()}`,
            rodoBalance.div(2),
            rodoBalance.mul(40).div(100),
            rodoBalance.mul(10).div(100),
          ]
        );
    });

    it("should return the extra eth", async () => {
      const {
        escrow,
        otherAccount,
        testToken,
        owner,
        rodoBalance,
        price,
        feePercentage,
        feeReceiver,
        admin,
      } = await loadFixture(deployEscrowFixture);
      const tokensPrice = Number(rodoBalance.div(2).mul(price)) / 1e18;
      const fee = Number(tokensPrice * Number(feePercentage)) / 1e5;
      const requiredEth = tokensPrice + fee;
      await expect(
        escrow.buy(rodoBalance.div(2), otherAccount.address, {
          value: requiredEth * 2,
        })
      ).to.changeEtherBalances(
        [feeReceiver.address, admin.address, owner.address],
        [fee, tokensPrice, -requiredEth]
      );
    });

    it("should give the required eth", async () => {
      const {
        escrow,
        otherAccount,
        testToken,
        owner,
        rodoBalance,
        price,
        feePercentage,
        feeReceiver,
        admin,
      } = await loadFixture(deployEscrowFixture);
      const tokensPrice = Number(rodoBalance.div(4).mul(price)) / 1e18;
      const fee = Number(tokensPrice * Number(feePercentage)) / 1e5;
      const expectedRequiredEth = tokensPrice + fee;
      expect(await escrow.requiredEth(rodoBalance.div(4))).to.be.equals(
        expectedRequiredEth
      );
    });
  });

  describe("OnlyOwner", function () {
    it("should be able to update price", async () => {
      const { escrow } = await loadFixture(deployEscrowFixture);
      await escrow.updatePrice(parseUnits("1"));
      expect(await escrow.price()).to.be.equals(parseUnits("1"));
    });
    it("should be able to update admin", async () => {
      const { escrow, owner } = await loadFixture(deployEscrowFixture);
      await escrow.updateAdmin(owner.address);
      expect(await escrow.owner()).to.be.equals(owner.address);
    });
    it("should be able to update feeReceiver", async () => {
      const { escrow, owner } = await loadFixture(deployEscrowFixture);
      await escrow.updateFeeReceiver(owner.address);
      expect(await escrow.feeReceiver()).to.be.equals(owner.address);
    });
    it("should be able to update fee Percentage", async () => {
      const { escrow } = await loadFixture(deployEscrowFixture);
      await escrow.updateFeePercentage(parseUnits("1"));
      expect(await escrow.feePercentage()).to.be.equals(parseUnits("1"));
    });
    it("should be able to update rodo token", async () => {
      const { escrow, owner } = await loadFixture(deployEscrowFixture);
      await escrow.updateRodo(owner.address);
      expect(await escrow.rodo()).to.be.equals(owner.address);
    });

    it("should be able to withdraw token", async () => {
      const { escrow, testToken, owner } = await loadFixture(
        deployEscrowFixture
      );
      const tokens = parseUnits("1000");
      await expect(
        escrow.withdrawToken(testToken.address, tokens)
      ).to.changeTokenBalances(
        testToken,
        [escrow.address, owner.address],
        [`-${tokens.toString()}`, tokens.toString()]
      );
    });
  });
});
