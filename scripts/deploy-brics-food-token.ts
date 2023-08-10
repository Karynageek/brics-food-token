import hre, { ethers } from "hardhat";
import { BRICSFoodToken__factory } from "../typechain/factories/contracts/BRICSFoodToken__factory";
import { BRICSFoodToken } from "../typechain/contracts/BRICSFoodToken";
import { parseUnits } from "ethers/lib/utils";

async function main() {
    const delay = (ms: any) => new Promise((res) => setTimeout(res, ms));

    let token: BRICSFoodToken;
    const name = 'BRICS Food Token';
    const symbol = 'BFT';
    const usdtContractAddress = '0x55d398326f99059fF775485246999027B3197955';
    const usdcContractAddress = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d';
    const busdContractAddress = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
    const usdtPaymentAmount = parseUnits('1', 18);
    const usdcPaymentAmount = parseUnits('1', 18);
    const busdPaymentAmount = parseUnits('1', 18);
    const fundingWallet = '0x131D1697d2cFB060493C14A4e6Fa72892770588E';
    const adminAddress = '0x131D1697d2cFB060493C14A4e6Fa72892770588E';
    const minterAddress = '0x131D1697d2cFB060493C14A4e6Fa72892770588E';
    const botAddress = '0x131D1697d2cFB060493C14A4e6Fa72892770588E';

    const BRICSFoodToken = (await ethers.getContractFactory('BRICSFoodToken')) as BRICSFoodToken__factory;
    token = await BRICSFoodToken.deploy(name, symbol, [usdtContractAddress, usdcContractAddress, busdContractAddress], [usdtPaymentAmount, usdcPaymentAmount, busdPaymentAmount], fundingWallet, adminAddress, minterAddress);
    await token.deployed();

    await token.grantRole(await token.BOT_ROLE(), botAddress);

    console.log("BRICSFoodToken deployed to:", token.address);

    await delay(35000);

    await hre.run("verify:verify", {
        address: token.address,
        constructorArguments: [name, symbol, [usdtContractAddress, usdcContractAddress, busdContractAddress], [usdtPaymentAmount, usdcPaymentAmount, busdPaymentAmount], fundingWallet, adminAddress, minterAddress],
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
