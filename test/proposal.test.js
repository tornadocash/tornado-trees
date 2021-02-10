/* global ethers */

const { expect } = require('chai')

describe('Proposal', () => {
  beforeEach(async function () {
    const Proposal = await ethers.getContractFactory('Proposal')
    const proposal = await Proposal.deploy()
    console.log('proposal', proposal)
  })

  it('should work for even array', () => {
    expect(2 + 2).to.be.equal(4)
  })
})
