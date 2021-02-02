// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat')
const { toFixedHex, poseidonHash2 } = require('../src/utils')
const toEns = (addr) => toFixedHex(addr, 20).padEnd(66, '0')
const MerkleTree = require('fixed-merkle-tree')

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const BatchTreeUpdateVerifier = await hre.ethers.getContractFactory('BatchTreeUpdateVerifier')
  const verifier = await BatchTreeUpdateVerifier.deploy()
  await verifier.deployed()
  const TornadoTrees = await hre.ethers.getContractFactory('TornadoTrees')
  // bytes32 _governance,
  //   bytes32 _tornadoProxy,
  //   bytes32 _treeUpdateVerifier,
  //   bytes32 _depositRoot,
  //   bytes32 _withdrawalRoot
  const levels = 20
  const tree = new MerkleTree(levels, [], { hashFunction: poseidonHash2 })
  const tornadoTrees = await TornadoTrees.deploy(
    toEns('0x5efda50f22d34F262c29268506C5Fa42cB56A1Ce'),
    toEns('0x905b63Fff465B9fFBF41DeA908CEb12478ec7601'),
    toEns(verifier.address),
    toFixedHex(tree.root()),
    toFixedHex(tree.root()),
  )
  await tornadoTrees.deployed()
  console.log('tornadoTrees deployed to:', tornadoTrees.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
