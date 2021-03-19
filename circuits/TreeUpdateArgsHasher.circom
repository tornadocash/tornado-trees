include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/sha256/sha256.circom";

template TreeUpdateArgsHasher(nLeaves) {
    signal private input oldRoot;
    signal private input newRoot;
    signal private input pathIndices;
    signal private input instances[nLeaves];
    signal private input hashes[nLeaves];
    signal private input blocks[nLeaves];
    signal output out;

    var header = 256 + 256 + 32;
    var bitsPerLeaf = 160 + 256 + 32;
    component hasher = Sha256(header + nLeaves * bitsPerLeaf);

    // the range check on old root is optional, it's enforced by smart contract anyway
    component bitsOldRoot = Num2Bits_strict();
    component bitsNewRoot = Num2Bits_strict();
    component bitsPathIndices = Num2Bits(32);
    component bitsInstance[nLeaves];
    component bitsHash[nLeaves];
    component bitsBlock[nLeaves];

    bitsOldRoot.in <== oldRoot;
    bitsNewRoot.in <== newRoot;
    bitsPathIndices.in <== pathIndices;

    hasher.in[0] <== 0;
    hasher.in[1] <== 0;
    for(var i = 0; i < 254; i++) {
        hasher.in[i + 2] <== bitsOldRoot.out[253 - i];
    }
    hasher.in[256] <== 0;
    hasher.in[257] <== 0;
    for(var i = 0; i < 254; i++) {
        hasher.in[i + 258] <== bitsNewRoot.out[253 - i];
    }
    for(var i = 0; i < 32; i++) {
        hasher.in[i + 512] <== bitsPathIndices.out[31 - i];
    }
    for(var leaf = 0; leaf < nLeaves; leaf++) {
        // the range check on hash is optional, it's enforced by the smart contract anyway
        bitsHash[leaf] = Num2Bits_strict();
        bitsInstance[leaf] = Num2Bits(160);
        bitsBlock[leaf] = Num2Bits(32);
        bitsHash[leaf].in <== hashes[leaf];
        bitsInstance[leaf].in <== instances[leaf];
        bitsBlock[leaf].in <== blocks[leaf];
        hasher.in[header + leaf * bitsPerLeaf + 0] <== 0;
        hasher.in[header + leaf * bitsPerLeaf + 1] <== 0;
        for(var i = 0; i < 254; i++) {
            hasher.in[header + leaf * bitsPerLeaf + i + 2] <== bitsHash[leaf].out[253 - i];
        }
        for(var i = 0; i < 160; i++) {
            hasher.in[header + leaf * bitsPerLeaf + i + 256] <== bitsInstance[leaf].out[159 - i];
        }
        for(var i = 0; i < 32; i++) {
            hasher.in[header + leaf * bitsPerLeaf + i + 416] <== bitsBlock[leaf].out[31 - i];
        }
    }
    component b2n = Bits2Num(256);
    for (var i = 0; i < 256; i++) {
        b2n.in[i] <== hasher.out[255 - i];
    }
    out <== b2n.out;
}
