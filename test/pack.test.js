/* global ethers */

const instances = [
  '0xc6325fa78E0764993Bf2997116A3771bCbcb3fa9',
  '0xb70738422D0f9d1225300eE0Fc67e7392095567d',
  '0xA675B536203a123B0214cdf1EBb1298F440dA19A',
  '0xFA1835cf197C3281Dc993a63bb160026dAC98bF3',
]

const hashes = [
  '0x6f44cd7458bf24f65851fa8097712e3a8d9a6f3e387c501b285338308a74b8f3',
  '0xafd3103939b7b0cd7a0ad1ddac57dd13af7f2825a21b47ae995b5bb0f767a106',
  '0x57f7b90a3cb4ea6860e6dd5fa44ac4f53ebe6ae3948af577a01ef51738313246',
]

const CHUNK_TREE_HEIGHT = 8
describe.skip('Pack', () => {
  it('should work', async () => {
    const Pack = await ethers.getContractFactory('Pack')
    const pack = await Pack.deploy()

    const notes = []
    for (let i = 0; i < 2 ** CHUNK_TREE_HEIGHT; i++) {
      notes[i] = {
        instance: instances[i % instances.length],
        hash: hashes[i % hashes.length],
        block: 1 + i,
      }
    }
    const receipt = await pack.pack2(
      notes.map((a) => a.hash),
      notes.map((a) => a.instance),
      notes.map((a) => a.block),
    )
    const receipt2 = await receipt.wait()

    console.log(`total ${receipt2.gasUsed}`)
    console.log(`batch size ${notes.length}`)
    console.log(`events ${await pack.gas1()}`)
    console.log(`hash ${await pack.gas2()}`)
    console.log(`bytes ${await pack.gas3()}`)
    console.log(`calldata ${receipt.gasLimit.sub(await pack.gas4())}`)
  })
})
