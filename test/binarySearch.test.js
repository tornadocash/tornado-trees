/* global ethers */

const { expect } = require('chai')

const depositsEven = [10, 11, 12, 13, 14, 15, 16, 17, 18]
const depositsOdd = [10, 11, 12, 13, 14, 15, 16, 17]

describe('findArrayLength', () => {
  let publicArray
  let tornadoTrees
  let PublicArray

  beforeEach(async function () {
    const [operator, tornadoProxy] = await ethers.getSigners()
    PublicArray = await ethers.getContractFactory('PublicArray')
    publicArray = await PublicArray.deploy()
    await publicArray.setDeposits(depositsEven)
    await publicArray.setWithdrawals(depositsEven)

    const TornadoTrees = await ethers.getContractFactory('TornadoTreesMock')
    tornadoTrees = await TornadoTrees.deploy(
      operator.address,
      tornadoProxy.address,
      publicArray.address,
      publicArray.address,
      {
        unprocessedDeposits: 3,
        unprocessedWithdrawals: 3,
        depositsPerDay: 2,
        withdrawalsPerDay: 2,
      },
    )
  })

  it('should work for even array', async () => {
    const depositsLength = await tornadoTrees.findArrayLength(publicArray.address, 'deposits(uint256)', 4, 2)
    expect(depositsLength).to.be.equal(depositsEven.length)
  })

  it('should work for odd array', async () => {
    publicArray = await PublicArray.deploy()
    await publicArray.setDeposits(depositsOdd)
    const depositsLength = await tornadoTrees.findArrayLength(publicArray.address, 'deposits(uint256)', 4, 2)
    expect(depositsLength).to.be.equal(depositsOdd.length)
  })

  it('should work for even array and odd step', async () => {
    const depositsLength = await tornadoTrees.findArrayLength(publicArray.address, 'deposits(uint256)', 4, 3)
    expect(depositsLength).to.be.equal(depositsEven.length)
  })

  it('should work for odd array and odd step', async () => {
    publicArray = await PublicArray.deploy()
    await publicArray.setDeposits(depositsOdd)
    const depositsLength = await tornadoTrees.findArrayLength(publicArray.address, 'deposits(uint256)', 4, 3)
    expect(depositsLength).to.be.equal(depositsOdd.length)
  })

  it('should work for odd array and step 1', async () => {
    publicArray = await PublicArray.deploy()
    await publicArray.setDeposits(depositsOdd)
    const depositsLength = await tornadoTrees.findArrayLength(publicArray.address, 'deposits(uint256)', 4, 1)
    expect(depositsLength).to.be.equal(depositsOdd.length)
  })

  it('should work for big array and big step', async () => {
    const deposits = Array.from(Array(100).keys())
    publicArray = await PublicArray.deploy()
    await publicArray.setDeposits(deposits)
    const depositsLength = await tornadoTrees.findArrayLength(
      publicArray.address,
      'deposits(uint256)',
      67,
      10,
    )
    expect(depositsLength).to.be.equal(deposits.length)
  })
})
