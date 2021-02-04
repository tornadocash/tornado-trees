// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "torn-token/contracts/ENS.sol";
import "./interfaces/ITornadoTreesV1.sol";
import "./interfaces/IVerifier.sol";

import "hardhat/console.sol";

contract TornadoTrees is EnsResolve {
  address public immutable governance;
  bytes32 public depositRoot;
  bytes32 public previousDepositRoot;
  bytes32 public withdrawalRoot;
  bytes32 public previousWithdrawalRoot;
  address public tornadoProxy;
  IVerifier public treeUpdateVerifier;

  // make sure CHUNK_TREE_HEIGHT has the same value in BatchTreeUpdate.circom
  uint256 public constant CHUNK_TREE_HEIGHT = 2;
  uint256 public constant CHUNK_SIZE = 2**CHUNK_TREE_HEIGHT;
  uint256 public constant ITEM_SIZE = 32 + 20 + 4;
  uint256 public constant BYTES_SIZE = 32 + 32 + 4 + CHUNK_SIZE * ITEM_SIZE;
  uint256 public constant SNARK_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

  bytes32[] public deposits;
  uint256 public lastProcessedDepositLeaf;

  bytes32[] public withdrawals;
  uint256 public lastProcessedWithdrawalLeaf;

  bool public initialized;

  event DepositData(address instance, bytes32 indexed hash, uint256 block, uint256 index);
  event WithdrawalData(address instance, bytes32 indexed hash, uint256 block, uint256 index);

  struct TreeLeaf {
    bytes32 hash;
    address instance;
    uint32 block;
  }

  struct Batch {
    bytes32 oldRoot;
    bytes32 newRoot;
    uint8 pathIndices;
    TreeLeaf[CHUNK_SIZE] events;
  }

  modifier onlyTornadoProxy {
    require(msg.sender == tornadoProxy, "Not authorized");
    _;
  }

  modifier onlyGovernance() {
    require(msg.sender == governance, "Only governance can perform this action");
    _;
  }

  modifier onlyInitialized() {
    require(initialized, "The contract is in the process of the migration");
    _;
  }

  constructor(
    address _governance,
    address _tornadoProxy,
    ITornadoTreesV1 _tornadoTreesV1,
    IVerifier _treeUpdateVerifier
  ) public {
    governance = _governance;
    tornadoProxy = _tornadoProxy;
    treeUpdateVerifier = _treeUpdateVerifier;

    depositRoot = _tornadoTreesV1.depositRoot();
    withdrawalRoot = _tornadoTreesV1.withdrawalRoot();

    uint256 depositLeaf = _tornadoTreesV1.lastProcessedDepositLeaf();
    require(depositLeaf % CHUNK_SIZE == 0, "Incorrect TornadoTrees state");
    lastProcessedDepositLeaf = depositLeaf;

    uint256 withdrawalLeaf = _tornadoTreesV1.lastProcessedWithdrawalLeaf();
    require(withdrawalLeaf % CHUNK_SIZE == 0, "Incorrect TornadoTrees state");
    lastProcessedWithdrawalLeaf = withdrawalLeaf;

    uint256 i = depositLeaf;

    // todo deposits.length = _tornadoTreesV1.deposits.length
    while (true) {
      (bool success, bytes memory data) = address(_tornadoTreesV1).staticcall{ gas: 3000 }( // todo define more specise gas value.
        abi.encodeWithSignature("deposits(uint256)", i)
      );
      if (!success) {
        break;
      }
      bytes32 deposit = abi.decode(data, (bytes32));
      i++;
      deposits.push(deposit);
    }

    i = withdrawalLeaf;
    while (true) {
      (bool success, bytes memory data) = address(_tornadoTreesV1).staticcall{ gas: 3000 }(
        abi.encodeWithSignature("withdrawals(uint256)", i)
      );

      if (!success) {
        break;
      }
      bytes32 withdrawal = abi.decode(data, (bytes32));
      i++;
      withdrawals.push(withdrawal);
    }
  }

  function registerDeposit(address _instance, bytes32 _commitment) external onlyTornadoProxy onlyInitialized {
    deposits.push(keccak256(abi.encode(_instance, _commitment, blockNumber())));
    emit DepositData(_instance, _commitment, blockNumber(), deposits.length - 1);
  }

  function registerWithdrawal(address _instance, bytes32 _nullifierHash) external onlyTornadoProxy onlyInitialized {
    withdrawals.push(keccak256(abi.encode(_instance, _nullifierHash, blockNumber())));
    emit WithdrawalData(_instance, _nullifierHash, blockNumber(), withdrawals.length - 1);
  }

  function migrate(TreeLeaf[] calldata _depositEvents, TreeLeaf[] calldata _withdrawalEvents) external {
    require(!initialized, "Already migrated");
    uint256 _lastProcessedDepositLeaf = lastProcessedDepositLeaf;
    uint256 _depositLength = deposits.length;
    for (uint256 i = 0; i < _depositLength - _lastProcessedDepositLeaf; i++) {
      bytes32 leafHash = keccak256(abi.encode(_depositEvents[i].instance, _depositEvents[i].hash, _depositEvents[i].block));
      require(leafHash == deposits[_lastProcessedDepositLeaf + i], "Incorrect deposit");
      emit DepositData(
        _depositEvents[i].instance,
        _depositEvents[i].hash,
        _depositEvents[i].block,
        _lastProcessedDepositLeaf + i
      );
    }

    uint256 _withdrawalLength = withdrawals.length;
    uint256 _lastProcessedWithdrawalLeaf = lastProcessedWithdrawalLeaf;
    for (uint256 i = 0; i < _withdrawalLength - _lastProcessedWithdrawalLeaf; i++) {
      bytes32 leafHash = keccak256(
        abi.encode(_withdrawalEvents[i].instance, _withdrawalEvents[i].hash, _withdrawalEvents[i].block)
      );
      require(leafHash == withdrawals[_lastProcessedWithdrawalLeaf + i], "Incorrect deposit");
      emit DepositData(
        _withdrawalEvents[i].instance,
        _withdrawalEvents[i].hash,
        _withdrawalEvents[i].block,
        _lastProcessedWithdrawalLeaf + i
      );
    }

    initialized = true;
  }

  function updateDepositTree(
    bytes calldata _proof,
    bytes32 _argsHash,
    bytes32 _currentRoot,
    bytes32 _newRoot,
    uint32 _pathIndices,
    TreeLeaf[CHUNK_SIZE] calldata _events
  ) public onlyInitialized {
    uint256 offset = lastProcessedDepositLeaf;
    require(_newRoot != previousDepositRoot, "Outdated deposit root");
    require(_currentRoot == depositRoot, "Proposed deposit root is invalid");
    require(_pathIndices == offset >> CHUNK_TREE_HEIGHT, "Incorrect insert index");

    bytes memory data = new bytes(BYTES_SIZE);
    assembly {
      mstore(add(data, 0x44), _pathIndices)
      mstore(add(data, 0x40), _newRoot)
      mstore(add(data, 0x20), _currentRoot)
    }
    for (uint256 i = 0; i < CHUNK_SIZE; i++) {
      (bytes32 hash, address instance, uint32 blockNumber) = (_events[i].hash, _events[i].instance, _events[i].block);
      bytes32 leafHash = keccak256(abi.encode(instance, hash, blockNumber));
      require(leafHash == deposits[offset + i], "Incorrect deposit");
      assembly {
        mstore(add(add(data, mul(ITEM_SIZE, i)), 0x7c), blockNumber)
        mstore(add(add(data, mul(ITEM_SIZE, i)), 0x78), instance)
        mstore(add(add(data, mul(ITEM_SIZE, i)), 0x64), hash)
      }
      delete deposits[offset + i];
    }

    uint256 argsHash = uint256(sha256(data)) % SNARK_FIELD;
    require(argsHash == uint256(_argsHash), "Invalid args hash");
    require(treeUpdateVerifier.verifyProof(_proof, [argsHash]), "Invalid deposit tree update proof");

    previousDepositRoot = _currentRoot;
    depositRoot = _newRoot;
    lastProcessedDepositLeaf = offset + CHUNK_SIZE;
  }

  function updateWithdrawalTree(
    bytes calldata _proof,
    bytes32 _argsHash,
    bytes32 _currentRoot,
    bytes32 _newRoot,
    uint256 _pathIndices,
    TreeLeaf[CHUNK_SIZE] calldata _events
  ) public onlyInitialized {
    uint256 offset = lastProcessedWithdrawalLeaf;
    require(_newRoot != previousWithdrawalRoot, "Outdated withdrawal root");
    require(_currentRoot == withdrawalRoot, "Proposed withdrawal root is invalid");
    require(_pathIndices == offset >> CHUNK_TREE_HEIGHT, "Incorrect insert index");
    require(uint256(_newRoot) < SNARK_FIELD, "Proposed root is out of range");

    bytes memory data = new bytes(BYTES_SIZE);
    assembly {
      mstore(add(data, 0x44), _pathIndices)
      mstore(add(data, 0x40), _newRoot)
      mstore(add(data, 0x20), _currentRoot)
    }
    for (uint256 i = 0; i < CHUNK_SIZE; i++) {
      (bytes32 hash, address instance, uint32 blockNumber) = (_events[i].hash, _events[i].instance, _events[i].block);
      bytes32 leafHash = keccak256(abi.encode(instance, hash, blockNumber));
      require(leafHash == withdrawals[offset + i], "Incorrect withdrawal");
      require(uint256(hash) < SNARK_FIELD, "Hash out of range");
      assembly {
        mstore(add(add(data, mul(ITEM_SIZE, i)), 0x7c), blockNumber)
        mstore(add(add(data, mul(ITEM_SIZE, i)), 0x78), instance)
        mstore(add(add(data, mul(ITEM_SIZE, i)), 0x64), hash)
      }
      delete withdrawals[offset + i];
    }

    uint256 argsHash = uint256(sha256(data)) % SNARK_FIELD;
    require(argsHash == uint256(_argsHash), "Invalid args hash");
    require(treeUpdateVerifier.verifyProof(_proof, [argsHash]), "Invalid withdrawal tree update proof");

    previousWithdrawalRoot = _currentRoot;
    withdrawalRoot = _newRoot;
    lastProcessedWithdrawalLeaf = offset + CHUNK_SIZE;
  }

  function validateRoots(bytes32 _depositRoot, bytes32 _withdrawalRoot) public view {
    require(_depositRoot == depositRoot || _depositRoot == previousDepositRoot, "Incorrect deposit tree root");
    require(_withdrawalRoot == withdrawalRoot || _withdrawalRoot == previousWithdrawalRoot, "Incorrect withdrawal tree root");
  }

  function getRegisteredDeposits() external view returns (uint256 count, bytes32[] memory _deposits) {
    count = deposits.length - lastProcessedDepositLeaf;
    _deposits = new bytes32[](count);
    for (uint256 i = 0; i < count; i++) {
      _deposits[i] = deposits[lastProcessedDepositLeaf + i];
    }
  }

  function getRegisteredWithdrawals() external view returns (uint256 count, bytes32[] memory _withdrawals) {
    count = withdrawals.length - lastProcessedWithdrawalLeaf;
    _withdrawals = new bytes32[](count);
    for (uint256 i = 0; i < count; i++) {
      _withdrawals[i] = withdrawals[lastProcessedWithdrawalLeaf + i];
    }
  }

  function setTornadoProxyContract(address _tornadoProxy) external onlyGovernance {
    tornadoProxy = _tornadoProxy;
  }

  function setVerifierContract(IVerifier _treeUpdateVerifier) external onlyGovernance {
    treeUpdateVerifier = _treeUpdateVerifier;
  }

  function blockNumber() public view virtual returns (uint256) {
    return block.number;
  }
}
