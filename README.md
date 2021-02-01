# Tornado.cash trees [![Build Status](https://github.com/tornadocash/tornado-anonymity-mining/workflows/build/badge.svg)](https://github.com/tornadocash/tornado-anonymity-mining/actions) [![npm](https://img.shields.io/npm/v/tornado-anonymity-mining)](https://www.npmjs.com/package/tornado-anonymity-mining)

This repo implements a more optimized version of the [TornadoTrees](https://github.com/tornadocash/tornado-anonymity-mining/blob/080d0f83665fa686d7fe42dd57fb5975d0f1ca58/contracts/TornadoTrees.sol) mechanism.

## Dependencies

1. node 12
2. yarn
3. zkutil (`brew install rust && cargo install zkutil`)

## Start

```bash
$ yarn
$ cp .env.example .env
$ yarn circuit
$ yarn test
```
