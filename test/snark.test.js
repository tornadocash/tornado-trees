/* global artifacts, web3, contract */
require('chai').use(require('bn-chai')(web3.utils.BN)).use(require('chai-as-promised')).should()
const MerkleTree = require('fixed-merkle-tree')
const { poseidonHash2, randomBN } = require('../src/utils')
const { batchTreeUpdate, prove } = require('../src/controller')

const levels = 20
const CHUNK_TREE_HEIGHT = 2
contract('Snark', () => {
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
    const data = await batchTreeUpdate(tree, events)
    const proof = await prove(data, './build/circuits/BatchTreeUpdate')
  })
})
