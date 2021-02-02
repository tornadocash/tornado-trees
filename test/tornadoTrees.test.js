/* global ethers */
const { expect } = require('chai')
const { toFixedHex, poseidonHash2, randomBN } = require('../src/utils')
const MerkleTree = require('fixed-merkle-tree')
const controller = require('../src/controller')

async function register(note, tornadoTrees, from) {
  await tornadoTrees
    .connect(from)
    .register(
      note.instance,
      toFixedHex(note.commitment),
      toFixedHex(note.nullifierHash),
      note.depositBlock,
      note.withdrawalBlock,
    )
}

const toEns = (addr) => toFixedHex(addr, 20).padEnd(66, '0')

const levels = 20
const CHUNK_TREE_HEIGHT = 2

const instances = [
  '0x1111000000000000000000000000000000001111',
  '0x2222000000000000000000000000000000002222',
  '0x3333000000000000000000000000000000003333',
  '0x4444000000000000000000000000000000004444',
]

const blocks = ['0xaaaaaaaa', '0xbbbbbbbb', '0xcccccccc', '0xdddddddd']

describe('TornadoTrees', function () {
  let tree
  let operator
  let tornadoProxy
  let verifier
  let tornadoTrees
  let notes
  const depositEvents = []
  const withdrawalEvents = []

  beforeEach(async function () {
    tree = new MerkleTree(levels, [], { hashFunction: poseidonHash2 })
    ;[operator, tornadoProxy] = await ethers.getSigners()

    const BatchTreeUpdateVerifier = await ethers.getContractFactory('BatchTreeUpdateVerifier')
    verifier = await BatchTreeUpdateVerifier.deploy()

    const TornadoTrees = await ethers.getContractFactory('TornadoTreesMock')
    tornadoTrees = await TornadoTrees.deploy(
      toEns(operator.address),
      toEns(tornadoProxy.address),
      toEns(verifier.address),
      toFixedHex(tree.root()),
      toFixedHex(tree.root()),
    )

    notes = []
    for (let i = 0; i < 2 ** CHUNK_TREE_HEIGHT; i++) {
      notes[i] = {
        instance: instances[i % instances.length],
        depositBlock: blocks[i % blocks.length],
        withdrawalBlock: 2 + i + i * 4 * 60 * 24,
        commitment: randomBN(),
        nullifierHash: randomBN(),
      }
      await register(notes[i], tornadoTrees, tornadoProxy)
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
  })

  describe('#updateDepositTree', () => {
    it('should check hash', async () => {
      const { args } = controller.batchTreeUpdate(tree, depositEvents)
      const solHash = await tornadoTrees.updateDepositTreeMock(...args.slice(1))
      expect(solHash).to.be.equal(args[0])
    })

    it('should prove snark', async () => {
      const { input, args } = controller.batchTreeUpdate(tree, depositEvents)
      const proof = await controller.prove(input, './artifacts/circuits/BatchTreeUpdate')
      await tornadoTrees.updateDepositTree(proof, ...args)

      const updatedRoot = await tornadoTrees.depositRoot()
      expect(updatedRoot).to.be.equal(tree.root())
    })

    it('should work for non-empty tree', async () => {
      let { input, args } = controller.batchTreeUpdate(tree, depositEvents)
      let proof = await controller.prove(input, './artifacts/circuits/BatchTreeUpdate')
      await tornadoTrees.updateDepositTree(proof, ...args)
      let updatedRoot = await tornadoTrees.depositRoot()
      expect(updatedRoot).to.be.equal(tree.root())
      //
      for (let i = 0; i < notes.length; i++) {
        await register(notes[i], tornadoTrees, tornadoProxy)
      }
      ;({ input, args } = controller.batchTreeUpdate(tree, depositEvents))
      proof = await controller.prove(input, './artifacts/circuits/BatchTreeUpdate')
      await tornadoTrees.updateDepositTree(proof, ...args)
      updatedRoot = await tornadoTrees.depositRoot()
      expect(updatedRoot).to.be.equal(tree.root())
    })
    it('should reject for partially filled tree')
    it('should reject for outdated deposit root')
    it('should reject for incorrect insert index')
    it('should reject for overflows of newRoot')
    it('should reject for invalid sha256 args')
  })

  describe('#getRegisteredDeposits', () => {
    it('should work', async () => {
      const abi = new ethers.utils.AbiCoder()
      let { count, _deposits } = await tornadoTrees.getRegisteredDeposits()
      expect(count).to.be.equal(notes.length)
      _deposits.forEach((hash, i) => {
        const encodedData = abi.encode(
          ['address', 'bytes32', 'uint256'],
          [notes[i].instance, toFixedHex(notes[i].commitment), notes[i].depositBlock],
        )
        const leaf = ethers.utils.keccak256(encodedData)

        expect(leaf).to.be.equal(hash)
      })
      // res.length.should.be.equal(1)
      // res[0].should.be.true
      // await tornadoTrees.updateRoots([note1DepositLeaf], [])

      // res = await tornadoTrees.getRegisteredDeposits()
      // res.length.should.be.equal(0)

      // await registerDeposit(note2, tornadoTrees)
      // res = await tornadoTrees.getRegisteredDeposits()
      // // res[0].should.be.true
    })
  })

  describe('#getRegisteredWithdrawals', () => {
    it('should work', async () => {
      const abi = new ethers.utils.AbiCoder()
      let { count, _withdrawals } = await tornadoTrees.getRegisteredWithdrawals()
      expect(count).to.be.equal(notes.length)
      _withdrawals.forEach((hash, i) => {
        const encodedData = abi.encode(
          ['address', 'bytes32', 'uint256'],
          [notes[i].instance, toFixedHex(notes[i].nullifierHash), notes[i].withdrawalBlock],
        )
        const leaf = ethers.utils.keccak256(encodedData)

        expect(leaf).to.be.equal(hash)
      })
    })
  })
})
