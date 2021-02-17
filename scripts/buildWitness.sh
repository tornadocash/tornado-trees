#!/bin/bash -e
# required dependencies: libgmp-dev nlohmann-json3-dev nasm g++
cd artifacts/circuits
node ../../node_modules/ffiasm/src/buildzqfield.js -q 21888242871839275222246405745257275088548364400416034343698204186575808495617 -n Fr
nasm -felf64 fr.asm
cp ../../node_modules/circom_runtime/c/*.cpp ./
cp ../../node_modules/circom_runtime/c/*.hpp ./
g++ -pthread main.cpp calcwit.cpp utils.cpp fr.cpp fr.o ${1}.cpp -o ${1} -lgmp -std=c++11 -O3 -fopenmp -DSANITY_CHECK
