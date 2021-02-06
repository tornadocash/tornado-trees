// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat')
const { toFixedHex, poseidonHash2, randomBN } = require('../src/utils')
const MerkleTree = require('fixed-merkle-tree')
const instances = [
  '0x1111000000000000000000000000000000001111',
  '0x2222000000000000000000000000000000002222',
  '0x3333000000000000000000000000000000003333',
  '0x4444000000000000000000000000000000004444',
]

const blocks = ['0xaaaaaaaa', '0xbbbbbbbb', '0xcccccccc', '0xdddddddd']
const CHUNK_TREE_HEIGHT = 2
const levels = 20

async function main() {
  const governance = '0x5efda50f22d34F262c29268506C5Fa42cB56A1Ce'
  const [tornadoProxy] = await hre.ethers.getSigners()
  console.log('deployer/tornadoProxy acc: ', tornadoProxy.address)

  const tree = new MerkleTree(levels, [], { hashFunction: poseidonHash2 })
  const TornadoTreesV1Mock = await hre.ethers.getContractFactory('TornadoTreesV1Mock')
  const tornadoTreesV1Mock = await TornadoTreesV1Mock.deploy(0, 0, tree.root(), tree.root())
  await tornadoTreesV1Mock.deployed()
  console.log('tornadoTreesV1Mock deployed to:', tornadoTreesV1Mock.address)

  const notes = []
  const depositEvents = []
  const withdrawalEvents = []
  for (let i = 0; i < 2 ** CHUNK_TREE_HEIGHT; i++) {
    notes[i] = {
      instance: instances[i % instances.length],
      depositBlock: blocks[i % blocks.length],
      withdrawalBlock: 2 + i + i * 4 * 60 * 24,
      commitment: randomBN(),
      nullifierHash: randomBN(),
    }
    await tornadoTreesV1Mock.register(
      notes[i].instance,
      toFixedHex(notes[i].commitment),
      toFixedHex(notes[i].nullifierHash),
      notes[i].depositBlock,
      notes[i].withdrawalBlock,
    )
    depositEvents[i] = {
      hash: toFixedHex(notes[i].commitment),
      instance: toFixedHex(notes[i].instance, 20),
      block: toFixedHex(notes[i].depositBlock, 4),
    }
    withdrawalEvents[i] = {
      hash: toFixedHex(notes[i].nullifierHash),
      instance: toFixedHex(notes[i].instance, 20),
      block: toFixedHex(notes[i].withdrawalBlock, 4),
    }
  }
  console.log(`Registered ${notes.length} new deposits and withdrawals in tornadoTreesV1Mock`)
  console.log(JSON.stringify(depositEvents, null, 2))
  console.log(JSON.stringify(withdrawalEvents, null, 2))

  const BatchTreeUpdateVerifier = await hre.ethers.getContractFactory('BatchTreeUpdateVerifier')
  const verifier = await BatchTreeUpdateVerifier.deploy()
  await verifier.deployed()
  console.log('Verifier deployed to:', verifier.address)

  const TornadoTrees = await hre.ethers.getContractFactory('TornadoTrees')
  const tornadoTrees = await TornadoTrees.deploy(
    governance,
    tornadoProxy.address,
    tornadoTreesV1Mock.address,
    verifier.address,
    {
      unprocessedDeposits: 1, // this approximate value, actually there are 4, but the contract will figure out that
      unprocessedWithdrawals: 1,
      depositsPerDay: 2, // parameter for searching the count of unprocessedDeposits
      withdrawalsPerDay: 2,
    },
  )
  await tornadoTrees.deployed()
  console.log('tornadoTrees deployed to:', tornadoTrees.address)
  console.log('You can use the same private key to register new deposits in the tornadoTrees')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
