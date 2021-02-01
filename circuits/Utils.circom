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

    component bitsOldRoot = Num2Bits(256);
    component bitsNewRoot = Num2Bits(256);
    component bitsPathIndices = Num2Bits(32);
    component bitsInstance[nLeaves];
    component bitsHash[nLeaves];
    component bitsBlock[nLeaves];
    
    bitsOldRoot.in <== oldRoot;
    bitsNewRoot.in <== newRoot;
    bitsPathIndices.in <== pathIndices;
    for(var i = 0; i < 256; i++) {
        hasher.in[i] <== bitsOldRoot.out[255 - i];
    }
    for(var i = 0; i < 256; i++) {
        hasher.in[i + 256] <== bitsNewRoot.out[255 - i];
    }
    for(var i = 0; i < 32; i++) {
        hasher.in[i + 512] <== bitsPathIndices.out[31 - i];
    }
    for(var leaf = 0; leaf < nLeaves; leaf++) {
        bitsHash[leaf] = Num2Bits(256);
        bitsInstance[leaf] = Num2Bits(160);
        bitsBlock[leaf] = Num2Bits(32);
        bitsHash[leaf].in <== hashes[leaf];
        bitsInstance[leaf].in <== instances[leaf];
        bitsBlock[leaf].in <== blocks[leaf];
        for(var i = 0; i < 256; i++) {
            hasher.in[header + leaf * bitsPerLeaf + i] <== bitsHash[leaf].out[255 - i];
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