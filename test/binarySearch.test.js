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
    tornadoTrees = await TornadoTrees.deploy(operator.address, publicArray.address, {
      depositsFrom: 3,
      depositsStep: 3,
      withdrawalsFrom: 2,
      withdrawalsStep: 2,
    })
    await tornadoTrees.initialize(tornadoProxy.address, publicArray.address)
  })

  it('should work for even array', async () => {
    const depositsLength = await tornadoTrees.findArrayLengthMock(
      publicArray.address,
      'deposits(uint256)',
      4,
      2,
    )
    expect(depositsLength).to.be.equal(depositsEven.length)
  })

  it('should work for empty array', async () => {
    publicArray = await PublicArray.deploy()
    // will throw out of gas if you pass non zero params
    const depositsLength = await tornadoTrees.findArrayLengthMock(
      publicArray.address,
      'deposits(uint256)',
      0,
      0,
    )
    expect(depositsLength).to.be.equal(0)
  })

  it('should work for odd array', async () => {
    publicArray = await PublicArray.deploy()
    await publicArray.setDeposits(depositsOdd)
    const depositsLength = await tornadoTrees.findArrayLengthMock(
      publicArray.address,
      'deposits(uint256)',
      4,
      2,
    )
    expect(depositsLength).to.be.equal(depositsOdd.length)
  })

  it('should work for even array and odd step', async () => {
    const depositsLength = await tornadoTrees.findArrayLengthMock(
      publicArray.address,
      'deposits(uint256)',
      4,
      3,
    )
    expect(depositsLength).to.be.equal(depositsEven.length)
  })

  it('should work for odd array and odd step', async () => {
    publicArray = await PublicArray.deploy()
    await publicArray.setDeposits(depositsOdd)
    const depositsLength = await tornadoTrees.findArrayLengthMock(
      publicArray.address,
      'deposits(uint256)',
      4,
      3,
    )
    expect(depositsLength).to.be.equal(depositsOdd.length)
  })

  it('should work for odd array and step 1', async () => {
    publicArray = await PublicArray.deploy()
    await publicArray.setDeposits(depositsOdd)
    const depositsLength = await tornadoTrees.findArrayLengthMock(
      publicArray.address,
      'deposits(uint256)',
      4,
      1,
    )
    expect(depositsLength).to.be.equal(depositsOdd.length)
  })

  it('should work for big array and big step', async () => {
    const deposits = Array.from(Array(100).keys())
    publicArray = await PublicArray.deploy()
    await publicArray.setDeposits(deposits)
    const depositsLength = await tornadoTrees.findArrayLengthMock(
      publicArray.address,
      'deposits(uint256)',
      67,
      10,
    )
    expect(depositsLength).to.be.equal(deposits.length)
  })

  it('should work for an array and big big step', async () => {
    const deposits = Array.from(Array(30).keys())
    publicArray = await PublicArray.deploy()
    await publicArray.setDeposits(deposits)
    const depositsLength = await tornadoTrees.findArrayLengthMock(
      publicArray.address,
      'deposits(uint256)',
      1,
      50,
    )
    expect(depositsLength).to.be.equal(deposits.length)
  })

  it('should pass stress test', async () => {
    const iterations = 30
    const days = 10
    const depositsPerDay = 10
    const dispersion = 5

    for (let i = 0; i < iterations; i++) {
      let len = 0
      for (let j = 0; j < days; j++) {
        len += depositsPerDay + Math.round((Math.random() - 0.5) * 2 * dispersion)
      }
      const deposits = Array.from(Array(len).keys())
      publicArray = await PublicArray.deploy()
      await publicArray.setDeposits(deposits)
      const depositsLength = await tornadoTrees.findArrayLengthMock(
        publicArray.address,
        'deposits(uint256)',
        days * depositsPerDay,
        dispersion * 2,
      )
      expect(depositsLength).to.be.equal(deposits.length)
    }
  })
})
