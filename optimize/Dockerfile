FROM ubuntu

RUN apt-get update && \
    apt-get install -y python3 python3-distutils g++ make curl git && \
    rm -rf /var/lib/apt/lists/*

# Install nvm with node and npm
RUN rm /bin/sh && ln -s /bin/bash /bin/sh
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 14.8.0
RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.30.1/install.sh | bash \
    && source $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default
ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH
RUN node --version

WORKDIR /root

RUN git clone https://github.com/nodejs/node.git
RUN git clone https://github.com/iden3/circom.git

COPY node.sh /tmp

RUN apt-get update && apt-get install -y ninja-build
RUN /tmp/node.sh

RUN cd circom && \
    git checkout v0.5.35 && \
    npm install

RUN git clone https://github.com/iden3/r1csoptimize
RUN cd r1csoptimize && \
    git checkout 8bc528b06c0f98818d1b5224e2078397f0bb7faf && \
    npm install

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
RUN source $HOME/.cargo/env && cargo install zkutil
RUN npm install -g circom snarkjs

WORKDIR /root/test
RUN npm init -y && npm install circomlib
RUN apt-get update && apt-get install -y ne
RUN mkdir circuits
COPY sha/circuit.circom sha/input.js test.sh ./circuits/
