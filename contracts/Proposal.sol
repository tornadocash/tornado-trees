//SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "./interfaces/ITornadoTreesV1.sol";
import "./interfaces/ITornadoProxyV1.sol";
import "./verifiers/BatchTreeUpdateVerifier.sol";
import "./interfaces/IBatchTreeUpdateVerifier.sol";
import "./TornadoTrees.sol";

// import tornadoProxy from anonymity mining repo branch v2

contract Proposal {
  ITornadoTreesV1 public immutable tornadoTreesV1 = ITornadoTreesV1(0x43a3bE4Ae954d9869836702AFd10393D3a7Ea417);
  ITornadoProxyV1 public immutable tornadoProxyV1 = ITornadoProxyV1(0x905b63Fff465B9fFBF41DeA908CEb12478ec7601);
  address[] public instances = [
    0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc,
    0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936,
    0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF,
    0xA160cdAB225685dA1d56aa342Ad8841c3b53f291
  ];

  // define erc20 instances

  function executeProposal() public {
    BatchTreeUpdateVerifier verifier = new BatchTreeUpdateVerifier();

    TornadoTrees.SearchParams memory searchParams = TornadoTrees.SearchParams({
      unprocessedDeposits: 8000,
      unprocessedWithdrawals: 8000,
      depositsPerDay: 50,
      withdrawalsPerDay: 50
    });
    address tornadoProxyAddress = computeAddress(address(this), 1);
    TornadoTrees tornadoTrees = new TornadoTrees(
      address(this),
      tornadoProxyAddress,
      tornadoTreesV1,
      IBatchTreeUpdateVerifier(address(verifier)),
      searchParams
    );

    for (uint256 i = 0; i < instances.length; i++) {
      tornadoProxyV1.updateInstance(instances[i], false);
    }

    // deploy new tornadoProxy
    // make sure you passed erc20 instances as well
    // require(address(tornadoProxy) == tornadoProxyAddress, "tornadoProxy deployed to an unexpected address");

    // set new trees contract on miner.sol
    // reduce quorum?
  }

  function computeAddress(address _origin, uint256 _nonce) public pure returns (address) {
    bytes memory data;
    if (_nonce == 0x00) data = abi.encodePacked(bytes1(0xd6), bytes1(0x94), _origin, bytes1(0x80));
    else if (_nonce <= 0x7f) data = abi.encodePacked(bytes1(0xd6), bytes1(0x94), _origin, bytes1(uint8(_nonce)));
    else if (_nonce <= 0xff) data = abi.encodePacked(bytes1(0xd7), bytes1(0x94), _origin, bytes1(0x81), uint8(_nonce));
    else if (_nonce <= 0xffff) data = abi.encodePacked(bytes1(0xd8), bytes1(0x94), _origin, bytes1(0x82), uint16(_nonce));
    else if (_nonce <= 0xffffff) data = abi.encodePacked(bytes1(0xd9), bytes1(0x94), _origin, bytes1(0x83), uint24(_nonce));
    else data = abi.encodePacked(bytes1(0xda), bytes1(0x94), _origin, bytes1(0x84), uint32(_nonce));
    bytes32 hash = keccak256(data);
    return address(uint160(uint256(hash)));
  }
}
