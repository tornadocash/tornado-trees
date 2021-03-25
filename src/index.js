const ethers = require('ethers')
const BigNumber = ethers.BigNumber
const { wtns } = require('snarkjs')
const { utils } = require('ffjavascript')

const { bitsToNumber, toBuffer, toFixedHex, poseidonHash } = require('./utils')

const jsSHA = require('jssha')

const fs = require('fs')
const tmp = require('tmp-promise')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

function hashInputs(input) {
  const sha = new jsSHA('SHA-256', 'ARRAYBUFFER')
  sha.update(toBuffer(input.oldRoot, 32))
  sha.update(toBuffer(input.newRoot, 32))
  sha.update(toBuffer(input.pathIndices, 4))

  for (let i = 0; i < input.instances.length; i++) {
    sha.update(toBuffer(input.hashes[i], 32))
    sha.update(toBuffer(input.instances[i], 20))
    sha.update(toBuffer(input.blocks[i], 4))
  }

  const hash = '0x' + sha.getHash('HEX')
  const result = BigNumber.from(hash)
    .mod(BigNumber.from('21888242871839275222246405745257275088548364400416034343698204186575808495617'))
    .toString()
  return result
}

function prove(input, keyBasePath) {
  return tmp.dir().then(async (dir) => {
    dir = dir.path
    let out

    try {
      if (fs.existsSync(`${keyBasePath}`)) {
        // native witness calc
        fs.writeFileSync(`${dir}/input.json`, JSON.stringify(input, null, 2))
        out = await exec(`${keyBasePath} ${dir}/input.json ${dir}/witness.json`)
      } else {
        await wtns.debug(
          utils.unstringifyBigInts(input),
          `${keyBasePath}.wasm`,
          `${dir}/witness.wtns`,
          `${keyBasePath}.sym`,
          {},
          console,
        )
        const witness = utils.stringifyBigInts(await wtns.exportJson(`${dir}/witness.wtns`))
        fs.writeFileSync(`${dir}/witness.json`, JSON.stringify(witness, null, 2))
      }
      out = await exec(
        `zkutil prove -c ${keyBasePath}.r1cs -p ${keyBasePath}.params -w ${dir}/witness.json -r ${dir}/proof.json -o ${dir}/public.json`,
      )
    } catch (e) {
      console.log(out, e)
      throw e
    }
    return '0x' + JSON.parse(fs.readFileSync(`${dir}/proof.json`)).proof
  })
}

/**
 * Generates inputs for a snark and tornado trees smart contract.
 * This function updates MerkleTree argument
 *
 * @param tree Merkle tree with current smart contract state. This object is mutated during function execution.
 * @param events New batch of events to insert.
 * @returns {{args: [string, string, string, string, *], input: {pathElements: *, instances: *, blocks: *, newRoot: *, hashes: *, oldRoot: *, pathIndices: string}}}
 */
function batchTreeUpdate(tree, events) {
  const batchHeight = Math.log2(events.length)
  if (!Number.isInteger(batchHeight)) {
    throw new Error('events length has to be power of 2')
  }

  const oldRoot = tree.root().toString()
  const leaves = events.map((e) => poseidonHash([e.instance, e.hash, e.block]))
  tree.bulkInsert(leaves)
  const newRoot = tree.root().toString()
  let { pathElements, pathIndices } = tree.path(tree.elements().length - 1)
  pathElements = pathElements.slice(batchHeight).map((a) => BigNumber.from(a).toString())
  pathIndices = bitsToNumber(pathIndices.slice(batchHeight)).toString()

  const input = {
    oldRoot,
    newRoot,
    pathIndices,
    pathElements,
    instances: events.map((e) => BigNumber.from(e.instance).toString()),
    hashes: events.map((e) => BigNumber.from(e.hash).toString()),
    blocks: events.map((e) => BigNumber.from(e.block).toString()),
  }

  input.argsHash = hashInputs(input)

  const args = [
    toFixedHex(input.argsHash),
    toFixedHex(input.oldRoot),
    toFixedHex(input.newRoot),
    toFixedHex(input.pathIndices, 4),
    events.map((e) => ({
      hash: toFixedHex(e.hash),
      instance: toFixedHex(e.instance, 20),
      block: toFixedHex(e.block, 4),
    })),
  ]
  return { input, args }
  // const proofData = await websnarkUtils.genWitnessAndProve(
  //   this.groth16,
  //   input,
  //   this.provingKeys.batchTreeUpdateCircuit,
  //   this.provingKeys.batchTreeUpdateProvingKey,
  // )
  // const { proof } = websnarkUtils.toSolidityInput(proofData)

  // const args = [
  //   toFixedHex(input.oldRoot),
  //   toFixedHex(input.newRoot),
  //   toFixedHex(input.pathIndices),
  //   events.map((e) => ({
  //     instance: toFixedHex(e.instance, 20),
  //     hash: toFixedHex(e.hash),
  //     block: toFixedHex(e.block),
  //   })),
  // ]

  // return {
  //   proof,
  //   args,
  // }
}

module.exports = { batchTreeUpdate, prove }
