#!/bin/bash -e
if [ "$2" = "large" ]; then
  npx circom -v -f -r build/circuits/$1.r1cs -c build/circuits/$1.cpp -s build/circuits/$1.sym circuits/$1.circom
else
  npx circom -v -r build/circuits/$1.r1cs -w build/circuits/$1.wasm  -s build/circuits/$1.sym circuits/$1.circom
fi
zkutil setup -c build/circuits/$1.r1cs -p build/circuits/$1.params
zkutil generate-verifier -p build/circuits/$1.params -v build/circuits/${1}Verifier.sol
sed -i.bak "s/contract Verifier/contract ${1}Verifier/g" build/circuits/${1}Verifier.sol
npx snarkjs info -r build/circuits/$1.r1cs
