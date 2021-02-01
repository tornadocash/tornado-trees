/* global artifacts, web3, contract */
require('chai').use(require('bn-chai')(web3.utils.BN)).use(require('chai-as-promised')).should()
const { takeSnapshot, revertSnapshot } = require('../scripts/ganacheHelper')
const controller = require('../src/controller')
const TornadoTrees = artifacts.require('TornadoTreesMock')
const BatchTreeUpdateVerifier = artifacts.require('BatchTreeUpdateVerifier')
const { toBN } = require('web3-utils')

const { toBN } = require('web3-utils')
const { toFixedHex, poseidonHash2, randomBN } = require('../src/utils')
const MerkleTree = require('fixed-merkle-tree')

async function registerDeposit(note, tornadoTrees, from) {
  await tornadoTrees.setBlockNumber(note.depositBlock)
  await tornadoTrees.registerDeposit(note.instance, toFixedHex(note.commitment), { from })
  return {
    instance: note.instance,
    hash: toFixedHex(note.commitment),
    block: toFixedHex(note.depositBlock),
  }
}

async function registerWithdrawal(note, tornadoTrees, from) {
  await tornadoTrees.setBlockNumber(note.withdrawalBlock)
  await tornadoTrees.registerWithdrawal(note.instance, toFixedHex(note.nullifierHash), { from })
  return {
    instance: note.instance,
    hash: toFixedHex(note.nullifierHash),
    block: toFixedHex(note.withdrawalBlock),
  }
}

async function register(note, tornadoTrees, from) {
  await tornadoTrees.register(
    note.instance,
    toFixedHex(note.commitment),
    toFixedHex(note.nullifierHash),
    note.depositBlock,
    note.withdrawalBlock,
    {
      from,
    },
  )
  return {
    instance: note.instance,
    hash: toFixedHex(note.nullifierHash),
    block: toFixedHex(note.withdrawalBlock),
  }
}

const levels = 20
const CHUNK_TREE_HEIGHT = 2
contract('TornadoTrees', (accounts) => {
  let tornadoTrees
  let verifier
  // let controller
  let snapshotId
  let tornadoProxy = accounts[0]
  let operator = accounts[0]

  const instances = [
    '0x1111000000000000000000000000000000001111',
    '0x2222000000000000000000000000000000002222',
    '0x3333000000000000000000000000000000003333',
    '0x4444000000000000000000000000000000004444',
  ]

  const blocks = ['0xaaaaaaaa', '0xbbbbbbbb', '0xcccccccc', '0xdddddddd']

  const notes = []

  before(async () => {
    const emptyTree = new MerkleTree(levels, [], { hashFunction: poseidonHash2 })
    verifier = await BatchTreeUpdateVerifier.new()
    tornadoTrees = await TornadoTrees.new(
      operator,
      tornadoProxy,
      verifier.address,
      toFixedHex(emptyTree.root()),
      toFixedHex(emptyTree.root()),
    )

    // controller = new Controller({
    //   contract: '',
    //   tornadoTreesContract: tornadoTrees,
    //   merkleTreeHeight: levels,
    //   provingKeys,
    // })
    // await controller.init()

    for (let i = 0; i < 2 ** CHUNK_TREE_HEIGHT; i++) {
      // onsole.log('i', i)
      notes[i] = {
        instance: instances[i % instances.length],
        depositBlock: blocks[i % blocks.length],
        withdrawalBlock: 2 + i + i * 4 * 60 * 24,
        commitment: randomBN(),
        nullifierHash: randomBN(),
      }
      await register(notes[i], tornadoTrees, tornadoProxy)
    }

    snapshotId = await takeSnapshot()
  })

  describe('#updateDepositTree', () => {
    it('should check hash', async () => {
      const emptyTree = new MerkleTree(levels, [], { hashFunction: poseidonHash2 })
      const events = notes.map((note) => ({
        hash: toFixedHex(note.commitment),
        instance: toFixedHex(note.instance, 20),
        block: toFixedHex(note.depositBlock, 4),
      }))
      const data = await controller.batchTreeUpdate(emptyTree, events)
      const solHash = await tornadoTrees.updateDepositTreeMock(
        toFixedHex(data.oldRoot),
        toFixedHex(data.newRoot),
        toFixedHex(data.pathIndices, 4),
        events,
      )
      toBN(data.argsHash).should.be.eq.BN(solHash)
    })

    it('should prove snark', async () => {
      const emptyTree = new MerkleTree(levels, [], { hashFunction: poseidonHash2 })
      const events = notes.map((note) => ({
        hash: toFixedHex(note.commitment),
        instance: toFixedHex(note.instance, 20),
        block: toFixedHex(note.depositBlock, 4),
      }))
      const data = await controller.batchTreeUpdate(emptyTree, events)
      const proof = await controller.prove(data, './build/circuits/BatchTreeUpdate')
      await tornadoTrees.updateDepositTree(
        proof,
        toFixedHex(data.argsHash),
        toFixedHex(data.oldRoot),
        toFixedHex(data.newRoot),
        toFixedHex(data.pathIndices, 4),
        events,
      )

      const updatedRoot = await tornadoTrees.depositRoot()
      updatedRoot.should.be.eq.BN(toBN(toFixedHex(data.newRoot)))
    })

    it('should work for non-empty tree')
    it('should reject for partially filled tree')
    it('should reject for outdated deposit root')
    it('should reject for incorrect insert index')
    it('should reject for overflows of newRoot')
    it('should reject for invalid sha256 args')
  })

  afterEach(async () => {
    await revertSnapshot(snapshotId.result)
    // eslint-disable-next-line require-atomic-updates
    snapshotId = await takeSnapshot()
  })
})
