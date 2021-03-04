// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

contract Pack {
  uint256 public constant CHUNK_TREE_HEIGHT = 8;
  uint256 public constant CHUNK_SIZE = 2**CHUNK_TREE_HEIGHT;
  uint256 public constant ITEM_SIZE = 32 + 20 + 4;
  uint256 public constant BYTES_SIZE = CHUNK_SIZE * ITEM_SIZE;

  uint256 public gas1;
  uint256 public gas2;
  uint256 public gas3;
  uint256 public gas4;
  bytes32 public hash;

  event DepositData(address instance, bytes32 indexed hash, uint256 block, uint256 index);

  function pack2(
    bytes32[CHUNK_SIZE] memory hashes,
    address[CHUNK_SIZE] memory instances,
    uint32[CHUNK_SIZE] memory blocks
  ) public {
    uint256 gasBefore = gasleft();
    bytes memory data = new bytes(BYTES_SIZE);
    for (uint256 i = 0; i < CHUNK_SIZE; i++) {
      (bytes32 _hash, address _instance, uint32 _block) = (hashes[i], instances[i], blocks[i]);
      assembly {
        mstore(add(add(data, mul(ITEM_SIZE, i)), 0x38), _block)
        mstore(add(add(data, mul(ITEM_SIZE, i)), 0x34), _instance)
        mstore(add(add(data, mul(ITEM_SIZE, i)), 0x20), _hash)
      }
    }
    uint256 gasHash = gasleft();
    bytes32 hash1 = sha256(data);
    uint256 gasEvents = gasleft();
    for (uint256 i = 0; i < CHUNK_SIZE; i++) {
      emit DepositData(instances[i], hashes[i], blocks[i], i);
    }
    gas1 = gasEvents - gasleft();
    gas2 = gasHash - gasEvents;
    gas3 = gasBefore - gasHash;
    gas4 = gasBefore;
    hash = hash1;
  }

  function pack3(
    bytes32[CHUNK_SIZE] memory hashes,
    address[CHUNK_SIZE] memory instances,
    uint32[CHUNK_SIZE] memory blocks
  )
    public
    view
    returns (
      uint256,
      uint256,
      bytes32
    )
  {
    uint256 gasBefore = gasleft();
    bytes memory data = new bytes(BYTES_SIZE);
    for (uint256 i = 0; i < CHUNK_SIZE; i++) {
      (bytes32 _hash, address _instance, uint32 _block) = (hashes[i], instances[i], blocks[i]);
      assembly {
        mstore(add(add(data, mul(ITEM_SIZE, i)), 0x38), _block)
        mstore(add(add(data, mul(ITEM_SIZE, i)), 0x34), _instance)
        mstore(add(add(data, mul(ITEM_SIZE, i)), 0x20), _hash)
      }
    }
    uint256 gasHash = gasleft();
    bytes32 hash1 = sha256(data);
    return (gasleft() - gasHash, gasHash - gasBefore, hash1);
  }
}
