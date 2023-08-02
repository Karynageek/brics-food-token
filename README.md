# PROJECT DEPLOYMENT FLOW

1. Clone the project from GitHub
2. Install dependencies
3. Customize configurations
4. Deploy

# 1. Clone the project from GitHub

Enter the following command in the terminal:

```shell
git clone https://github.com/Karynageek/brics-food-token
```

# 2. Install dependencies

Before launch next command open the terminal into the the main folder of project
Then, enter:

```shell
npm install
```

# 3. Customize configurations

In this project:

1. Rename the .env.example file to a file named .env
2. In the .env file change:

a) Set up API key
- if you deploy in BSC you should set up your BSCScan API key

To get the BSCScan API key, go to
<a href="https://bscscan.com//myapikey">https://bscscan.com/myapikey </a>

b) Your wallet and private key of the account which will send the deployment transaction

# 4. Deploy

# DEPLOY ON BSC TESTNET

```shell
npx hardhat run scripts/deploy-brics-food-token.ts --network bscTestnet
```

# DEPLOY ON BSC MAINNET

```shell
npx hardhat run scripts/deploy-brics-food-token.ts --network bscMainnet
```

# VERIFICATION

Verification is automated