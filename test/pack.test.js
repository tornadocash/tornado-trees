/* global artifacts, web3, contract */
require('chai').use(require('bn-chai')(web3.utils.BN)).use(require('chai-as-promised')).should()
const { takeSnapshot, revertSnapshot } = require('../scripts/ganacheHelper')
const Ccntroller = require('../src/controller')
const { toBN } = require('web3-utils')
const Pack = artifacts.require('Pack')
const jsSHA = require('jssha')

const { poseidonHash2 } = require('../src/utils')
const MerkleTree = require('fixed-merkle-tree')

const levels = 20
const CHUNK_TREE_HEIGHT = 7
contract.skip('Pack', (accounts) => {
  let pack
  let snapshotId

  const instances = [
    '0xc6325fa78E0764993Bf2997116A3771bCbcb3fa9',
    '0xb70738422D0f9d1225300eE0Fc67e7392095567d',
    '0xA675B536203a123B0214cdf1EBb1298F440dA19A',
    '0xFA1835cf197C3281Dc993a63bb160026dAC98bF3',
  ]

  const hashes = [
    '0x6f44cd7458bf24f65851fa8097712e3a8d9a6f3e387c501b285338308a74b8f3',
    '0xafd3103939b7b0cd7a0ad1ddac57dd13af7f2825a21b47ae995b5bb0f767a106',
    '0x57f7b90a3cb4ea6860e6dd5fa44ac4f53ebe6ae3948af577a01ef51738313246'
  ]

  const notes = []

  before(async () => {
    const emptyTree = new MerkleTree(levels, [], { hashFunction: poseidonHash2 })
    pack = await Pack.new()

    for (let i = 0; i < 2 ** CHUNK_TREE_HEIGHT; i++) {
      notes[i] = {
        instance: instances[i % instances.length],
        hash: hashes[i % hashes.length],
        block: 1 + i,
      }
    }

    snapshotId = await takeSnapshot()
  })

  describe('#pack', () => {
    it('gastest', async () => {
      const emptyTree = new MerkleTree(levels, [], { hashFunction: poseidonHash2 })
      const receipt = await pack.pack2(notes.map(a => a.hash), notes.map(a => a.instance), notes.map(a => a.block), { gas: 6e6 })
      console.log('total', receipt.receipt.gasUsed)

      const sha = new jsSHA('SHA-256', 'ARRAYBUFFER')
      for (let i = 0; i < notes.length; i++) {
        sha.update(toBN(notes[i].hash).toBuffer('be', 32))
        sha.update(toBN(notes[i].instance).toBuffer('be', 20))
        sha.update(toBN(notes[i].block).toBuffer('be', 4))
      }
      const hash = sha.getHash('HEX')

      const solHash = await pack.hash()
      solHash.should.be.equal('0x' + hash)
      console.log('batch size', notes.length)
      console.log('events', (await pack.gas1()).toString())
      console.log('hash', (await pack.gas2()).toString())
      console.log('bytes',(await pack.gas3()).toString())
      console.log('calldata', toBN(6e6).sub(await pack.gas4()).toString())
    })
  })

  afterEach(async () => {
    await revertSnapshot(snapshotId.result)
    // eslint-disable-next-line require-atomic-updates
    snapshotId = await takeSnapshot()
  })
})
