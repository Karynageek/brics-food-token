import { expect } from "chai";
import { ethers } from "hardhat";
import { BRICSFoodToken__factory } from "../typechain/factories/contracts/BRICSFoodToken__factory";
import { BRICSFoodToken } from "../typechain/contracts/BRICSFoodToken";
import { USDTMock__factory } from "../typechain/factories/contracts/test/USDTMock__factory";
import { USDTMock } from "../typechain/contracts/test/USDTMock";
import { USDCMock__factory } from "../typechain/factories/contracts/test/USDCMock__factory";
import { USDCMock } from "../typechain/contracts/test/USDCMock";
import { BUSDMock__factory } from "../typechain/factories/contracts/test/BUSDMock__factory";
import { BUSDMock } from "../typechain/contracts/test/BUSDMock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseUnits } from "ethers/lib/utils";

describe('BRICSFoodToken contract', () => {
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const name = 'BRICS Food Token ';
    const symbol = 'BFT';
    const price = 1;
    let BRICSFoodToken: BRICSFoodToken__factory;
    let token: BRICSFoodToken;
    let usdtMock: USDTMock;
    let usdcMock: USDCMock;
    let busdMock: BUSDMock;
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;
    let minter: SignerWithAddress;
    let bot: SignerWithAddress;
    let fundingWallet: SignerWithAddress;
    let addrs: SignerWithAddress[];
    let usdtPaymentAmount: any;
    let usdcPaymentAmount: any;
    let busdPaymentAmount: any;

    beforeEach(async () => {
        [owner, addr1, addr2, minter, bot, fundingWallet, ...addrs] = await ethers.getSigners();

        const USDTMock = (await ethers.getContractFactory('USDTMock')) as USDTMock__factory;
        usdtMock = await USDTMock.deploy();
        await usdtMock.deployed();

        const USDCMock = (await ethers.getContractFactory('USDCMock')) as USDCMock__factory;
        usdcMock = await USDCMock.deploy();
        await usdcMock.deployed();

        const BUSDMock = (await ethers.getContractFactory('BUSDMock')) as BUSDMock__factory;
        busdMock = await BUSDMock.deploy();
        await busdMock.deployed();

        usdtPaymentAmount = parseUnits('1', await usdtMock.decimals());
        usdcPaymentAmount = parseUnits('1', await usdcMock.decimals());
        busdPaymentAmount = parseUnits('1', await busdMock.decimals());

        BRICSFoodToken = (await ethers.getContractFactory('BRICSFoodToken')) as BRICSFoodToken__factory;
    });

    describe('initial values', async () => {
        it('should set initial values successfully', async () => {
            /* SETUP */
            token = await BRICSFoodToken.deploy(name, symbol, [usdtMock.address, usdcMock.address, busdMock.address], [usdtPaymentAmount, usdcPaymentAmount, busdPaymentAmount], fundingWallet.address, owner.address, minter.address);
            await token.deployed();

            await token.grantRole(await token.BOT_ROLE(), bot.address);

            /* ASSERT */
            expect(await token.hasRole(await token.DEFAULT_ADMIN_ROLE(), owner.address)).to.true;
            expect(await token.hasRole(await token.MINTER_ROLE(), minter.address)).to.true;
            expect(await token.hasRole(await token.BOT_ROLE(), bot.address)).to.true;
            expect(price).to.equal(await token.price());
            expect(name).to.equal(await token.name());
            expect(symbol).to.equal(await token.symbol());
            expect(fundingWallet.address).to.equal(await token.fundingWallet());
            expect(await token.tokenPaymentAmounts(usdtMock.address), usdtPaymentAmount);
            expect(await token.tokenPaymentAmounts(usdcMock.address), usdcPaymentAmount);
            expect(await token.tokenPaymentAmounts(busdMock.address), busdPaymentAmount);
        })

        it('should reject if data lengths not match', async () => {
            /* ASSERT */
            await expect(BRICSFoodToken.deploy(name, symbol, [usdtMock.address, usdcMock.address], [usdtPaymentAmount, usdcPaymentAmount, busdPaymentAmount], fundingWallet.address, owner.address, minter.address)
            ).to.be.revertedWith('DataLengthsNotMatch()');
        })
    });

    describe('buy function', async () => {
        beforeEach(async () => {
            token = await BRICSFoodToken.deploy(name, symbol, [usdtMock.address, usdcMock.address, busdMock.address], [usdtPaymentAmount, usdcPaymentAmount, busdPaymentAmount], fundingWallet.address, owner.address, minter.address);
            await token.deployed();
        });

        it('should buy tokens by a user if payment token is usdt', async () => {
            /* SETUP */
            const amount = 10;
            const paymentToken = usdtMock.address;
            const minted = 1;
            await token.connect(minter).mint(addr2.address, minted);
            const usdtAmount = await token.calculateTotalPrice(amount, paymentToken);

            /* EXECUTE */
            await usdtMock.connect(addr1).mint(addr1.address, usdtAmount);
            await usdtMock.connect(addr1).approve(token.address, usdtAmount);

            const fundingBalanceBefore = await usdtMock.balanceOf(fundingWallet.address);
            const addr1BalanceBefore = await usdtMock.balanceOf(addr1.address);

            const tx = await token.connect(addr1).buy(amount, paymentToken);

            const fundingBalanceAfter = await usdtMock.balanceOf(fundingWallet.address);
            const addr1BalanceAfter = await usdtMock.balanceOf(addr1.address);

            /* ASSERT */
            expect(await token.mintedCount()).to.equal(amount + minted);
            expect(fundingBalanceAfter).to.equal(fundingBalanceBefore.add(usdtAmount));
            expect(addr1BalanceAfter).to.equal(addr1BalanceBefore.sub(usdtAmount));
            expect(await token.balanceOf(addr1.address)).to.equal(amount);

            await expect(tx).to.emit(token, 'Bought')
                .withArgs(addr1.address, amount, paymentToken, usdtAmount);
        });

        it('should buy tokens by a user if payment token is usdc', async () => {
            /* SETUP */
            const amount = 10;
            const paymentToken = usdcMock.address;
            const usdcAmount = await token.calculateTotalPrice(amount, paymentToken);

            /* EXECUTE */
            await usdcMock.connect(addr1).mint(addr1.address, usdcAmount);
            await usdcMock.connect(addr1).approve(token.address, usdcAmount);

            const fundingBalanceBefore = await usdcMock.balanceOf(fundingWallet.address);
            const addr1BalanceBefore = await usdcMock.balanceOf(addr1.address);

            const tx = await token.connect(addr1).buy(amount, paymentToken);

            const fundingBalanceAfter = await usdcMock.balanceOf(fundingWallet.address);
            const addr1BalanceAfter = await usdcMock.balanceOf(addr1.address);

            /* ASSERT */
            expect(await token.mintedCount()).to.equal(amount);
            expect(fundingBalanceAfter).to.equal(fundingBalanceBefore.add(usdcAmount));
            expect(addr1BalanceAfter).to.equal(addr1BalanceBefore.sub(usdcAmount));
            expect(await token.balanceOf(addr1.address)).to.equal(amount);

            await expect(tx).to.emit(token, 'Bought')
                .withArgs(addr1.address, amount, paymentToken, usdcAmount);
        });

        it('should buy tokens by a user if payment token is busd', async () => {
            /* SETUP */
            const amount = 10;
            const paymentToken = busdMock.address;
            const busdAmount = await token.calculateTotalPrice(amount, paymentToken);

            /* EXECUTE */
            await busdMock.connect(addr1).mint(addr1.address, busdAmount);
            await busdMock.connect(addr1).approve(token.address, busdAmount);

            const fundingBalanceBefore = await busdMock.balanceOf(fundingWallet.address);
            const addr1BalanceBefore = await busdMock.balanceOf(addr1.address);

            const tx = await token.connect(addr1).buy(amount, paymentToken);

            const fundingBalanceAfter = await busdMock.balanceOf(fundingWallet.address);
            const addr1BalanceAfter = await busdMock.balanceOf(addr1.address);

            /* ASSERT */
            expect(await token.mintedCount()).to.equal(amount);
            expect(fundingBalanceAfter).to.equal(fundingBalanceBefore.add(busdAmount));
            expect(addr1BalanceAfter).to.equal(addr1BalanceBefore.sub(busdAmount));
            expect(await token.balanceOf(addr1.address)).to.equal(amount);

            await expect(tx).to.emit(token, 'Bought')
                .withArgs(addr1.address, amount, paymentToken, busdAmount);
        });

        it('should revert if sale has stopped', async () => {
            /* SETUP */
            await token.connect(owner).stopSale();
            const amount = 10;
            const paymentToken = busdMock.address;

            /* ASSERT */
            await expect(token.connect(addr1).buy(amount, paymentToken)).to.be.revertedWith(
                'SaleHasStopped()'
            );
        });

        it('should revert if max mint count is exceeded', async () => {
            /* SETUP */
            await token.connect(minter).mint(addr1.address, await token.MAX_TOTAL_SUPPLY());
            const amount = 1;
            const paymentToken = busdMock.address;

            /* ASSERT */
            await expect(token.connect(addr1).buy(amount, paymentToken)).to.be.revertedWith(
                'ExceededMaxTokenSupply()'
            );
        });

        it('should revert if amount is 0', async () => {
            /* SETUP */
            const amount = 0;
            const paymentToken = busdMock.address;

            /* ASSERT */
            await expect(token.connect(minter).buy(amount, paymentToken)).to.be.revertedWith(
                'InvalidValue()'
            );
        });

        it('should revert if unsupported payment token is used', async () => {
            /* SETUP */
            const amount = 10;
            const paymentToken = ethers.constants.AddressZero;

            /* ASSERT */
            await expect(token.connect(addr1).buy(amount, paymentToken)).to.be.revertedWith(
                'UnsupportedPaymentToken()'
            );
        });
    });

    describe('mint function', async () => {
        beforeEach(async () => {
            token = await BRICSFoodToken.deploy(name, symbol, [usdtMock.address, usdcMock.address, busdMock.address], [usdtPaymentAmount, usdcPaymentAmount, busdPaymentAmount], fundingWallet.address, owner.address, minter.address);
            await token.deployed();
        });

        it('should mint tokens by an admin', async () => {
            /* SETUP */
            const amount = await token.MAX_TOTAL_SUPPLY();

            /* EXECUTE */
            const tx = await token.connect(minter).mint(addr1.address, amount);

            /* ASSERT */
            expect(await token.mintedCount()).to.equal(amount);
            expect(await token.balanceOf(addr1.address)).to.equal(amount);
            await expect(tx).to.emit(token, 'Minted')
                .withArgs(addr1.address, amount);
        });

        it('should revert if max mint count is exceeded', async () => {
            /* SETUP */
            const amount = (await token.MAX_TOTAL_SUPPLY()).add(parseUnits('1', 18));

            /* ASSERT */
            await expect(token.connect(minter).mint(addr1.address, amount)).to.be.revertedWith(
                'ExceededMaxTokenSupply()'
            );
        });

        it('should revert if sale has stopped', async () => {
            /* SETUP */
            await token.connect(owner).stopSale();
            const amount = 1;

            /* ASSERT */
            await expect(token.connect(minter).mint(addr1.address, amount)).to.be.revertedWith(
                'SaleHasStopped()'
            );
        });

        it('should revert if amount is 0', async () => {
            /* SETUP */
            const amount = 0;

            /* ASSERT */
            await expect(token.connect(minter).mint(addr1.address, amount)).to.be.revertedWith(
                'InvalidValue()'
            );
        });

        it('rejects if not default minter role', async () => {
            /* SETUP */
            const amount = 10;

            /* ASSERT */
            await expect(token.connect(owner).mint(addr1.address, amount)).to.be.revertedWith(
                `AccessControl: account ${owner.address.toLowerCase()} is missing role ${await token.MINTER_ROLE()}`
            );
        });
    });

    describe('calculateTotalPrice', () => {
        beforeEach(async () => {
            token = await BRICSFoodToken.deploy(name, symbol, [usdtMock.address, usdcMock.address, busdMock.address], [usdtPaymentAmount, usdcPaymentAmount, busdPaymentAmount], fundingWallet.address, owner.address, minter.address);
            await token.deployed();
        });

        it('should calculate the total price correctly without discount', async () => {
            /* SETUP */
            const amount = 10;
            const paymentToken = busdMock.address;
            const basePrice = price;
            const currentTokenPrice = basePrice * amount;
            const busdAmount = parseUnits(currentTokenPrice.toString(), await busdMock.decimals());

            /* EXECUTE */
            const totalPrice = await token.calculateTotalPrice(amount, paymentToken);

            /* ASSERT */
            expect(totalPrice).to.equal(busdAmount);
        });

        it('should revert if payment token is not supported', async () => {
            /* SETUP */
            const amount = 10;

            /* ASSERT */
            await expect(token.calculateTotalPrice(amount, zeroAddress)).to.be.revertedWith('UnsupportedPaymentToken()');
        });
    });

    describe('sets the price', async () => {
        beforeEach(async () => {
            token = await BRICSFoodToken.deploy(name, symbol, [usdtMock.address, usdcMock.address, busdMock.address], [usdtPaymentAmount, usdcPaymentAmount, busdPaymentAmount], fundingWallet.address, owner.address, minter.address);
            await token.deployed();
        });

        it('should set the price by the admin', async () => {
            /* SETUP */
            const newPrice = 50;

            /* EXECUTE */
            await token.connect(owner).setPrice(newPrice);

            /* ASSERT */
            const price = await token.price();

            expect(newPrice).to.equal(price);
        });

        it('should set the price by the bot within the lower allowed range', async () => {
            /* SETUP */
            await token.grantRole(await token.BOT_ROLE(), bot.address);

            const lowerLimit = 2;
            const upperLimit = 20;

            await token.connect(owner).setPrice(30);
            await token.setPriceLimits(lowerLimit, upperLimit);

            const currentPrice = await token.price();
            const newPrice = currentPrice - lowerLimit;

            /* EXECUTE */
            await token.connect(bot).setPrice(newPrice);

            /* ASSERT */
            const price = await token.price();

            expect(newPrice).to.equal(price);
        });


        it('should set the price by the bot within the higher allowed range', async () => {
            /* SETUP */
            await token.grantRole(await token.BOT_ROLE(), bot.address);

            const lowerLimit = 2;
            const upperLimit = 20;

            await token.connect(owner).setPrice(3);
            await token.setPriceLimits(lowerLimit, upperLimit);

            const currentPrice = await token.price();
            const newPrice = currentPrice + upperLimit;

            /* EXECUTE */
            await token.connect(bot).setPrice(newPrice);

            /* ASSERT */
            const price = await token.price();

            expect(newPrice).to.equal(price);
        });

        it("should revert when setting the price outside the higher allowed range by the bot", async () => {
            /* SETUP */
            await token.grantRole(await token.BOT_ROLE(), bot.address);

            const lowerLimit = 2;
            const upperLimit = 20;

            await token.connect(owner).setPrice(3);
            await token.setPriceLimits(lowerLimit, upperLimit);

            const currentPrice = await token.price();
            const newPrice = currentPrice + upperLimit + 1;

            /* ASSERT */
            await expect(token.connect(bot).setPrice(newPrice)).to.be.revertedWith('InvalidPrice()');
        });

        it("should revert when setting the price outside the lower allowed range by the bot", async () => {
            /* SETUP */
            await token.grantRole(await token.BOT_ROLE(), bot.address);

            const lowerLimit = 10;
            const upperLimit = 20;

            await token.connect(owner).setPrice(30);
            await token.setPriceLimits(lowerLimit, upperLimit);

            const currentPrice = await token.price();

            const newPrice = currentPrice - lowerLimit - 1;

            /* ASSERT */
            expect(currentPrice).to.greaterThan(newPrice);
            await expect(token.connect(bot).setPrice(newPrice)).to.be.revertedWith('InvalidPrice()');
        });

        it('should revert when setting the price below the minimum token price', async () => {
            /* SETUP */
            const newPrice = 0;

            /* ASSERT */
            await expect(token.connect(owner).setPrice(newPrice)).to.be.revertedWith('InvalidPrice()');
        });

        it('should revert when setting the price by a non-admin and non-bot', async () => {
            /* SETUP */
            const newPrice = 50;

            /* ASSERT */
            await expect(token.connect(addr1).setPrice(newPrice)).to.be.revertedWith('MissingRole()');
        });
    });

    describe("setPriceLimits", () => {
        beforeEach(async () => {
            token = await BRICSFoodToken.deploy(name, symbol, [usdtMock.address, usdcMock.address, busdMock.address], [usdtPaymentAmount, usdcPaymentAmount, busdPaymentAmount], fundingWallet.address, owner.address, minter.address);
            await token.deployed();
        });

        it("should set the price limits by the admin", async () => {
            const lowerLimit = 29;
            const upperLimit = 45;

            await token.connect(owner).setPrice(30);
            await token.setPriceLimits(lowerLimit, upperLimit);

            const updatedLowerLimit = await token.priceLowerLimit();
            const updatedUpperLimit = await token.priceUpperLimit();

            expect(updatedLowerLimit).to.equal(lowerLimit);
            expect(updatedUpperLimit).to.equal(upperLimit);
        });

        it("should revert when setting the lower limit above the sum of MIN_TOKEN_PRICE and the current price", async () => {
            const currentPrice = await token.price();
            const invalidLowerLimit = currentPrice + 1;

            await expect(token.connect(owner).setPriceLimits(invalidLowerLimit, currentPrice)).to.be.revertedWith("InvalidLimit()");
        });

        it("should revert when setting the upper limit below the lower limit", async () => {
            const lowerLimit = 5;
            const upperLimit = 4;

            await token.connect(owner).setPrice(30);

            await expect(token.connect(owner).setPriceLimits(lowerLimit, upperLimit)).to.be.revertedWith("InvalidLimit()");
        });

        it("should revert when a non-admin tries to set the price limits", async () => {
            const lowerLimit = 0;
            const upperLimit = 1;

            await expect(token.connect(addr1).setPriceLimits(lowerLimit, upperLimit)).to.be.revertedWith(
                `AccessControl: account ${addr1.address.toLowerCase()} is missing role ${await token.DEFAULT_ADMIN_ROLE()}`
            );
        });
    });

    describe('sets funding wallet', async () => {
        beforeEach(async () => {
            token = await BRICSFoodToken.deploy(name, symbol, [usdtMock.address, usdcMock.address, busdMock.address], [usdtPaymentAmount, usdcPaymentAmount, busdPaymentAmount], fundingWallet.address, owner.address, minter.address);
            await token.deployed();
        });

        it('sets funding wallet successfully', async () => {
            /* SETUP */
            const fundingWalletBefore = await token.fundingWallet();

            /* EXECUTE */
            await token.connect(owner).setFundingWallet(addr2.address);

            /* ASSERT */
            const fundingWalletAfter = await token.fundingWallet();

            expect(fundingWalletAfter).to.not.equal(fundingWalletBefore);
            expect(fundingWalletAfter).to.equal(addr2.address);
        });

        it('rejects setting while zero address', async () => {
            /* ASSERT */
            await expect(token.connect(owner).setFundingWallet(zeroAddress)).to.be.revertedWith('ZeroAddress()');
        });

        it('rejects if not default admin role', async () => {
            /* ASSERT */
            await expect(token.connect(addr1).setFundingWallet(addr2.address)).to.be.revertedWith(
                `AccessControl: account ${addr1.address.toLowerCase()} is missing role ${await token.DEFAULT_ADMIN_ROLE()}`
            );
        });
    });

    describe('stops sale', async () => {
        beforeEach(async () => {
            token = await BRICSFoodToken.deploy(name, symbol, [usdtMock.address, usdcMock.address, busdMock.address], [usdtPaymentAmount, usdcPaymentAmount, busdPaymentAmount], fundingWallet.address, owner.address, minter.address);
            await token.deployed();
        });

        it('stops sale successfully if default admin role', async () => {
            /* SETUP */
            const saleStoppedBefore = await token.saleStopped();

            /* EXECUTE */
            const tx = await token.connect(owner).stopSale();

            /* ASSERT */
            const saleStoppedAfter = await token.saleStopped();

            expect(saleStoppedAfter).to.not.equal(saleStoppedBefore);
            expect(saleStoppedAfter).to.true;
            await expect(tx).to.emit(token, 'SaleStopped');
        });

        it('stops sale successfully if bot role', async () => {
            /* SETUP */
            await token.grantRole(await token.BOT_ROLE(), bot.address);

            const saleStoppedBefore = await token.saleStopped();

            /* EXECUTE */
            const tx = await token.connect(bot).stopSale();

            /* ASSERT */
            const saleStoppedAfter = await token.saleStopped();

            expect(saleStoppedAfter).to.not.equal(saleStoppedBefore);
            expect(saleStoppedAfter).to.true;
            await expect(tx).to.emit(token, 'SaleStopped');
        });

        it('rejects if not default admin or bot role', async () => {
            /* ASSERT */
            await expect(token.connect(addr1).stopSale()).to.be.revertedWith('MissingRole()');
        });
    });

    describe('sets token payment amount', async () => {
        beforeEach(async () => {
            token = await BRICSFoodToken.deploy(name, symbol, [usdtMock.address, usdcMock.address, busdMock.address], [usdtPaymentAmount, usdcPaymentAmount, busdPaymentAmount], fundingWallet.address, owner.address, minter.address);
            await token.deployed();
        });

        it('should set token payment amount successfully', async () => {
            /* SETUP */
            const tokenContractAddress = '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee'
            const paymentAmount = parseUnits('1', 18);

            /* EXECUTE */
            await token.connect(owner).setTokenPaymentAmount(tokenContractAddress, paymentAmount);

            /* ASSERT */
            expect(await token.tokenPaymentAmounts(tokenContractAddress), paymentAmount.toString());
        });

        it('rejects setting while zero address', async () => {
            /* SETUP */
            const paymentAmount = parseUnits('1', 18);

            /* ASSERT */
            await expect(token.connect(owner).setTokenPaymentAmount(zeroAddress, paymentAmount)).to.be.revertedWith('ZeroAddress()');
        });

        it('rejects if not default admin role', async () => {
            /* SETUP */
            const tokenContractAddress = '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee'
            const paymentAmount = parseUnits('1', 18);

            /* ASSERT */
            await expect(token.connect(addr1).setTokenPaymentAmount(tokenContractAddress, paymentAmount)).to.be.revertedWith(
                `AccessControl: account ${addr1.address.toLowerCase()} is missing role ${await token.DEFAULT_ADMIN_ROLE()}`
            );
        });
    });
}); 