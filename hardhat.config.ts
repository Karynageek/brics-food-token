import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "ethereum-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-ethers";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000000,
      },
    },
  },
  networks: {
    bscMainnet: {
      url: process.env.BSC_MAINNET_RPC_URL || "",
      from: process.env.WALLET || "",
      accounts: [ process.env.PRIVATE_KEY || "" ],
    },
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC_URL || "",
      from: process.env.WALLET || "",
      accounts: [ process.env.PRIVATE_KEY || "" ],
    },
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.BSCSCAN_API_KEY || ""
  },
};

export default config;
