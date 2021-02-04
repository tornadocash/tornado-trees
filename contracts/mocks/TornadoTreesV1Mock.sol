// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

contract TornadoTreesV1Mock {
  uint256 public timestamp;
  uint256 public currentBlock;

  bytes32[] public deposits;
  uint256 public lastProcessedDepositLeaf;

  bytes32[] public withdrawals;
  uint256 public lastProcessedWithdrawalLeaf;

  bytes32 public depositRoot;
  bytes32 public withdrawalRoot;

  constructor(
    uint256 _lastProcessedDepositLeaf,
    uint256 _lastProcessedWithdrawalLeaf,
    bytes32 _depositRoot,
    bytes32 _withdrawalRoot
  ) public {
    lastProcessedDepositLeaf = _lastProcessedDepositLeaf;
    lastProcessedWithdrawalLeaf = _lastProcessedWithdrawalLeaf;
    depositRoot = _depositRoot;
    withdrawalRoot = _withdrawalRoot;
  }

  function register(
    address _instance,
    bytes32 _commitment,
    bytes32 _nullifier,
    uint256 _depositBlockNumber,
    uint256 _withdrawBlockNumber
  ) public {
    setBlockNumber(_depositBlockNumber);
    deposits.push(keccak256(abi.encode(_instance, _commitment, blockNumber())));
    setBlockNumber(_withdrawBlockNumber);
    withdrawals.push(keccak256(abi.encode(_instance, _nullifier, blockNumber())));
  }

  function setLastProcessedDepositLeaf(uint256 _lastProcessedDepositLeaf) public {
    lastProcessedDepositLeaf = _lastProcessedDepositLeaf;
  }

  function setLastProcessedWithdrawalLeaf(uint256 _lastProcessedWithdrawalLeaf) public {
    lastProcessedWithdrawalLeaf = _lastProcessedWithdrawalLeaf;
  }

  function resolve(bytes32 _addr) public pure returns (address) {
    return address(uint160(uint256(_addr) >> (12 * 8)));
  }

  function setBlockNumber(uint256 _blockNumber) public {
    currentBlock = _blockNumber;
  }

  function blockNumber() public view returns (uint256) {
    return currentBlock == 0 ? block.number : currentBlock;
  }
}
