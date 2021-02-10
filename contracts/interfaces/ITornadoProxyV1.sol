// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

interface ITornadoProxyV1 {
  function updateInstance(address _instance, bool _update) external;
}
