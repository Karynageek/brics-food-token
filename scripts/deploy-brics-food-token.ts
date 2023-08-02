import hre, { ethers } from "hardhat";
import { BRICSFoodToken__factory } from "../typechain/factories/contracts/BRICSFoodToken__factory";
import { BRICSFoodToken } from "../typechain/contracts/BRICSFoodToken";
import { parseUnits } from "ethers/lib/utils";

async function main() {
    const delay = (ms: any) => new Promise((res) => setTimeout(res, ms));

    let token: BRICSFoodToken;
    const name = 'BRICS Food Token ';
    const symbol = 'BFT';
    const usdtContractAddress = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd';
    const usdcContractAddress = '0x64544969ed7ebf5f083679233325356ebe738930';
    const busdContractAddress = '0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee';
    const usdtPaymentAmount = parseUnits('1', 18);
    const usdcPaymentAmount = parseUnits('1', 18);
    const busdPaymentAmount = parseUnits('1', 18);
    const fundingWallet = '0x131D1697d2cFB060493C14A4e6Fa72892770588E';
    const adminAddress = '0x131D1697d2cFB060493C14A4e6Fa72892770588E';
    const minterAddress = '0x131D1697d2cFB060493C14A4e6Fa72892770588E';

    const BRICSFoodToken = (await ethers.getContractFactory('BRICSFoodToken')) as BRICSFoodToken__factory;
    token = await BRICSFoodToken.deploy(name, symbol, [usdtContractAddress, usdcContractAddress, busdContractAddress], [usdtPaymentAmount, usdcPaymentAmount, busdPaymentAmount], fundingWallet, adminAddress, minterAddress);
    await token.deployed();

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
