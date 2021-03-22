// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "../TornadoTrees.sol";
import "../interfaces/ITornadoTreesV1.sol";
import "../interfaces/IBatchTreeUpdateVerifier.sol";

contract TornadoTreesMock is TornadoTrees {
  uint256 public currentBlock;

  constructor(
    address _governance,
    ITornadoTreesV1 _tornadoTreesV1,
    SearchParams memory _searchParams
  ) public TornadoTrees(_governance, _tornadoTreesV1, _searchParams) {}

  function setBlockNumber(uint256 _blockNumber) public {
    currentBlock = _blockNumber;
  }

  function blockNumber() public view override returns (uint256) {
    return currentBlock == 0 ? block.number : currentBlock;
  }

  function findArrayLengthMock(
    ITornadoTreesV1 _tornadoTreesV1,
    string memory _type,
    uint256 _from,
    uint256 _step
  ) public view returns (uint256) {
    return findArrayLength(_tornadoTreesV1, _type, _from, _step);
  }

  function register(
    address _instance,
    bytes32 _commitment,
    bytes32 _nullifier,
    uint256 _depositBlockNumber,
    uint256 _withdrawBlockNumber
  ) public {
    setBlockNumber(_depositBlockNumber);
    registerDeposit(_instance, _commitment);

    setBlockNumber(_withdrawBlockNumber);
    registerWithdrawal(_instance, _nullifier);
  }

  function updateRoots(bytes32 _depositRoot, bytes32 _withdrawalRoot) public {
    depositRoot = _depositRoot;
    withdrawalRoot = _withdrawalRoot;
  }

  function updateDepositTreeMock(
    bytes32 _oldRoot,
    bytes32 _newRoot,
    uint32 _pathIndices,
    TreeLeaf[] calldata _events
  ) public pure returns (uint256) {
    bytes memory data = new bytes(BYTES_SIZE);
    assembly {
      mstore(add(data, 0x44), _pathIndices)
      mstore(add(data, 0x40), _newRoot)
      mstore(add(data, 0x20), _oldRoot)
    }
    for (uint256 i = 0; i < CHUNK_SIZE; i++) {
      (bytes32 hash, address instance, uint32 depositBlock) = (_events[i].hash, _events[i].instance, _events[i].block);
      assembly {
        mstore(add(add(data, mul(ITEM_SIZE, i)), 0x7c), depositBlock)
        mstore(add(add(data, mul(ITEM_SIZE, i)), 0x78), instance)
        mstore(add(add(data, mul(ITEM_SIZE, i)), 0x64), hash)
      }
    }
    return uint256(sha256(data)) % SNARK_FIELD;
  }

  function updateDepositTreeMock2(
    bytes32 _oldRoot,
    bytes32 _newRoot,
    uint32 _pathIndices,
    TreeLeaf[] calldata _events
  ) public pure returns (bytes memory) {
    bytes memory data = new bytes(BYTES_SIZE);
    assembly {
      mstore(add(data, 0x44), _pathIndices)
      mstore(add(data, 0x40), _newRoot)
      mstore(add(data, 0x20), _oldRoot)
    }
    for (uint256 i = 0; i < CHUNK_SIZE; i++) {
      (bytes32 hash, address instance, uint32 depositBlock) = (_events[i].hash, _events[i].instance, _events[i].block);
      assembly {
        mstore(add(add(data, mul(ITEM_SIZE, i)), 0x7c), depositBlock)
        mstore(add(add(data, mul(ITEM_SIZE, i)), 0x78), instance)
        mstore(add(add(data, mul(ITEM_SIZE, i)), 0x64), hash)
      }
    }
    return data;
  }

  function getRegisteredDeposits() external view returns (bytes32[] memory _deposits) {
    uint256 count = depositsLength - lastProcessedDepositLeaf;
    _deposits = new bytes32[](count);
    for (uint256 i = 0; i < count; i++) {
      _deposits[i] = deposits[lastProcessedDepositLeaf + i];
    }
  }

  function getRegisteredWithdrawals() external view returns (bytes32[] memory _withdrawals) {
    uint256 count = withdrawalsLength - lastProcessedWithdrawalLeaf;
    _withdrawals = new bytes32[](count);
    for (uint256 i = 0; i < count; i++) {
      _withdrawals[i] = withdrawals[lastProcessedWithdrawalLeaf + i];
    }
  }

  function findArrayLength(
    ITornadoTreesV1 _tornadoTreesV1,
    string memory _type,
    uint256 _from, // most likely array length after the proposal has passed
    uint256 _step // optimal step size to find first match, approximately equals dispersion
  ) internal view override returns (uint256) {
    if (_from == 0 && _step == 0) {
      return 0;
    }
    return super.findArrayLength(_tornadoTreesV1, _type, _from, _step);
  }
}
