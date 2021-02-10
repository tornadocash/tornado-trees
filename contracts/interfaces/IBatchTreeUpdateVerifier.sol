// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

interface IBatchTreeUpdateVerifier {
  function verifyProof(bytes calldata proof, uint256[1] calldata input) external view returns (bool);
}
