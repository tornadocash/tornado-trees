FROM node:14-buster

ENTRYPOINT bash
RUN apt-get update && \
    apt-get install -y libgmp-dev nlohmann-json3-dev nasm g++ git curl && \
    rm -rf /var/lib/apt/lists/*

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
RUN cargo install zkutil

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn
COPY circuits circuits
COPY scripts scripts
# ENV NODE_OPTIONS='--trace-gc --trace-gc-ignore-scavenger --max-old-space-size=2048000 --initial-old-space-size=2048000 --no-global-gc-scheduling --no-incremental-marking --max-semi-space-size=1024 --initial-heap-size=2048000'
ENV NODE_OPTIONS='--max-old-space-size=2048000'
RUN yarn circuit:batchTreeUpdateLarge
RUN yarn circuit:batchTreeUpdateWitness
COPY . .
