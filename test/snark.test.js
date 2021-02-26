const { expect } = require('chai')
const MerkleTree = require('fixed-merkle-tree')
const { poseidonHash2, randomBN } = require('../src/utils')
const { batchTreeUpdate, prove } = require('../src/index')

const levels = 20
const CHUNK_TREE_HEIGHT = 8
describe('Snark', () => {
  it('should work', async () => {
    const tree = new MerkleTree(levels, [], { hashFunction: poseidonHash2 })
    const events = []
    for (let i = 0; i < 2 ** CHUNK_TREE_HEIGHT; i++) {
      events.push({
        hash: randomBN(31).toString(),
        instance: randomBN(20).toString(),
        block: randomBN(4).toString(),
      })
    }
    const { input } = batchTreeUpdate(tree, events)
    const proof = await prove(input, './artifacts/circuits/BatchTreeUpdate')

    expect(proof.length).to.be.gt(0)
  })
})
