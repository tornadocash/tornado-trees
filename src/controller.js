const {
  bitsToNumber,
  toFixedHex,
  poseidonHash,
  poseidonHash2,
} = require('./utils')
const jsSHA = require('jssha')
const { toBN } = require('web3-utils')

const fs = require('fs')
const tmp = require('tmp-promise')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

function hashInputs(input) {
  const sha = new jsSHA('SHA-256', 'ARRAYBUFFER')
  sha.update(toBN(input.oldRoot).toBuffer('be', 32))
  sha.update(toBN(input.newRoot).toBuffer('be', 32))
  sha.update(toBN(input.pathIndices).toBuffer('be', 4))

  for (let i = 0; i < input.instances.length; i++) {
    sha.update(toBN(input.hashes[i]).toBuffer('be', 32))
    sha.update(toBN(input.instances[i]).toBuffer('be', 20))
    sha.update(toBN(input.blocks[i]).toBuffer('be', 4))
  }

  const hash = sha.getHash('HEX')
  const result = toBN(hash).mod(toBN('21888242871839275222246405745257275088548364400416034343698204186575808495617')).toString()
  return result
}

function prove(input, keyBasePath) {
  return tmp.dir().then(async dir => {
    dir = dir.path
    fs.writeFileSync(`${dir}/input.json`, JSON.stringify(input, null, 2))
    let out

    try {
      if (fs.existsSync(`${keyBasePath}`)) {
        // native witness calc
        out = await exec(`${keyBasePath} ${dir}/input.json ${dir}/witness.json`)
      } else {
        out = await exec(`npx snarkjs wd ${keyBasePath}.wasm ${dir}/input.json ${dir}/witness.wtns`)
        out = await exec(`npx snarkjs wej ${dir}/witness.wtns ${dir}/witness.json`)
      }
      out = await exec(`zkutil prove -c ${keyBasePath}.r1cs -p ${keyBasePath}.params -w ${dir}/witness.json -r ${dir}/proof.json -o ${dir}/public.json`)
    } catch (e) {
      console.log(out, e)
      throw e
    }
    return '0x' + JSON.parse(fs.readFileSync(`${dir}/proof.json`)).proof
  });
}

function batchTreeUpdate(tree, events) {
  const batchHeight = 2 //await this.tornadoTreesContract.CHUNK_TREE_HEIGHT()
  if (events.length !== 1 << batchHeight) {
    throw new Error('events length does not match the batch size')
  }

  const oldRoot = tree.root().toString()
  const leaves = events.map((e) => poseidonHash([e.instance, e.hash, e.block]))
  tree.bulkInsert(leaves)
  const newRoot = tree.root().toString()
  let { pathElements, pathIndices } = tree.path(tree.elements().length - 1)
  pathElements = pathElements.slice(batchHeight).map(a => toBN(a).toString())
  pathIndices = bitsToNumber(pathIndices.slice(batchHeight)).toString()

  const input = {
    oldRoot,
    newRoot,
    pathIndices,
    pathElements,
    instances: events.map((e) => toBN(e.instance).toString()),
    hashes: events.map((e) => toBN(e.hash).toString()),
    blocks: events.map((e) => toBN(e.block).toString()),
  }

  input.argsHash = hashInputs(input)
  return input
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
