/* global task, ethers */
require('@nomiclabs/hardhat-waffle')
require('dotenv').config()
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async () => {
  const accounts = await ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
})

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config = {
  solidity: {
    version: '0.6.12',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      blockGasLimit: 9500000,
    },
  },
  mocha: {
    timeout: 600000,
  },
}

if (process.env.NETWORK) {
  config.networks[process.env.NETWORK] = {
    url: `https://${process.env.NETWORK}.infura.io/v3/${process.env.INFURA_TOKEN}`,
    accounts: [process.env.PRIVATE_KEY],
  }
}
module.exports = config
