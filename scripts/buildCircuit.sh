#!/bin/bash -e
mkdir -p artifacts/circuits
if [ "$2" = "large" ]; then
  npx circom -v -f -r artifacts/circuits/$1.r1cs -c artifacts/circuits/$1.cpp -s artifacts/circuits/$1.sym circuits/$1.circom
else
  npx circom -v -r artifacts/circuits/$1.r1cs -w artifacts/circuits/$1.wasm -s artifacts/circuits/$1.sym circuits/$1.circom
fi
zkutil setup -c artifacts/circuits/$1.r1cs -p artifacts/circuits/$1.params
zkutil generate-verifier -p artifacts/circuits/$1.params -v artifacts/circuits/${1}Verifier.sol
sed -i.bak "s/contract Verifier/contract ${1}Verifier/g" artifacts/circuits/${1}Verifier.sol
npx snarkjs info -r artifacts/circuits/$1.r1cs
