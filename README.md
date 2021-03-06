# Tornado.cash trees [![Build Status](https://github.com/tornadocash/tornado-trees/workflows/build/badge.svg)](https://github.com/tornadocash/tornado-trees/actions)

This repo implements a more optimized version of the [TornadoTrees](https://github.com/tornadocash/tornado-anonymity-mining/blob/080d0f83665fa686d7fe42dd57fb5975d0f1ca58/contracts/TornadoTrees.sol) mechanism.

## Dependencies

1. node 12
2. yarn
3. zkutil (`brew install rust && cargo install zkutil`)

## Start

```bash
$ yarn
$ yarn circuit
$ yarn test
```

## Mainnet testing

```bash
$ yarn circuit
$ npx hardhat node --fork <https://eth-mainnet.alchemyapi.io/v2/API_KEY> --fork-block-number 11827889
$ npx hardhat test
```

## build large circuits

Make sure you have enough RAM

```bash
docker build . -t tornadocash/tornado-trees
```
