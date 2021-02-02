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
  let events

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
    }

    events = notes.map((note) => ({
      hash: toFixedHex(note.commitment),
      instance: toFixedHex(note.instance, 20),
      block: toFixedHex(note.depositBlock, 4),
    }))
  })

  it('Should calculate hash', async function () {
    const data = await controller.batchTreeUpdate(tree, events)
    const solHash = await tornadoTrees.updateDepositTreeMock(
      toFixedHex(data.oldRoot),
      toFixedHex(data.newRoot),
      toFixedHex(data.pathIndices, 4),
      events,
    )
    expect(solHash).to.be.equal(data.argsHash)
  })

  it('Should calculate hash', async function () {
    const data = await controller.batchTreeUpdate(tree, events)
    const proof = await controller.prove(data, './artifacts/circuits/BatchTreeUpdate')
    await tornadoTrees.updateDepositTree(
      proof,
      toFixedHex(data.argsHash),
      toFixedHex(data.oldRoot),
      toFixedHex(data.newRoot),
      toFixedHex(data.pathIndices, 4),
      events,
    )
    expect(await tornadoTrees.depositRoot()).to.be.equal(tree.root())
  })

  it('should work for non-empty tree')
  it('should reject for partially filled tree')
  it('should reject for outdated deposit root')
  it('should reject for incorrect insert index')
  it('should reject for overflows of newRoot')
  it('should reject for invalid sha256 args')
})
