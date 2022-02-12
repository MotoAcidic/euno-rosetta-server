FROM ubuntu:focal
USER root
WORKDIR /data

ARG dgb_version=7.17.2

# Update apt cache and set tzdata to non-interactive or it will fail later.
# Also install essential dependencies for the build project.
RUN apt-get update \
  && apt-get nodejs npm \
  apt install build-essential libtool autotools-dev automake pkg-config bsdmainutils curl git -y && \
  apt-get install libqt5gui5 libqt5core5a libqt5dbus5 qttools5-dev qttools5-dev-tools libprotobuf-dev protobuf-compiler -y && \
  apt-get install software-properties-common -y && \
  echo "" | sudo add-apt-repository ppa:bitcoin/bitcoin && \
  apt-get update && \
  apt-get install libdb4.8-dev libdb4.8++-dev -y && \
  apt-get install libboost-system-dev libboost-filesystem-dev libboost-chrono-dev libboost-program-options-dev libboost-test-dev libboost-thread-dev -y && \
  apt-get install libzmq3-dev -y && \
  apt-get install libminiupnpc-dev -y && \
  apt-get install libgmp3-dev libevent-dev bsdmainutils libboost-all-dev openssl

# Clone the Core wallet source from GitHub and checkout the version.
RUN git clone https://github.com/MotoAcidic/eunowallet/

# Use multiple processors to build DigiByte from source.
# Warning: It will try to utilize all your systems cores, which speeds up the build process,
# but consumes a lot of memory which could lead to OOM-Errors during the build process.
# Recommendation: Enable this on machines that have more than 16GB RAM.
ARG parallize_build=0

# Determine how many cores the build process will use.
RUN export CORES="" && [ $parallize_build -gt 1 ] && export CORES="-j $(nproc)"; \
  echo "Using $parallize_build core(s) for build process."

# Prepare the build process
ARG rootdatadir=/data
RUN cd ${rootdatadir}/eunowallet && ./autogen.sh && ./configure --with-incompatible-bdb --disable-wallet --without-gui --without-miniupnpc

# Start the build process
RUN cd ${rootdatadir}/eunowallet && make

# Delete source
#RUN rm -rf ${rootdatadir}/digibyte

RUN mkdir -vp \
  "/root/rosetta-node" \
  "${rootdatadir}/.eunopay" \
  "${rootdatadir}/utxodb" \
  "/tmp/npm_install"

# Copy and install rosetta implementation
COPY package.json package-lock.json /tmp/npm_install/
RUN cd /tmp/npm_install && \
  npm set progress=false && \
  npm config set depth 0 && \
  npm install 
RUN cp -a /tmp/npm_install/node_modules "/root/rosetta-node/"

# Copy the source to rosetta node directory
COPY package*.json "/root/rosetta-node/"
COPY config "/root/rosetta-node/config"
COPY index.js "/root/rosetta-node/index.js"
COPY src "/root/rosetta-node/src"
COPY test "/root/rosetta-node/test"

# General args
ARG rpc_username=user
ARG rpc_password=pass
ARG offline=0
ARG regtest_simulate_mining=0

# Set to 1 for running it in testnet mode
ARG use_testnet=0

# OR set this to 1 to enable Regtest mode.
# Note: Only one of the above can be set exclusively.
ARG use_regtest=0

# Do we want any blockchain pruning to take place? Set to 4096 for a 4GB blockchain prune.
# Alternatively set size=1 to prune with RPC call 'pruneblockchainheight <height>'
ARG prunesize=0

# Create digibyte.conf file
RUN bash -c 'echo -e "\
server=1\n\
prune=${prunesize}\n\
maxconnections=300\n\
rpcallowip=127.0.0.1\n\
daemon=1\n\
rpcuser=${rpc_username}\n\
rpcpassword=${rpc_password}\n\
txindex=0\n\
# Uncomment below if you need Dandelion disabled for any reason but it is left on by default intentionally\n\
disabledandelion=1\n\
addresstype=bech32\n\
testnet=${use_testnet}\n\
rpcworkqueue=32\n\
regtest=${use_regtest}\n\
[regtest]\n\
rpcbind=127.0.0.1\n\
listen=1\n" | tee "${rootdatadir}/eunopay.conf"'

# Set some environment variables
ENV ROOTDATADIR "$rootdatadir"
ENV ROSETTADIR "/root/rosetta-node"
ENV EUNO_VERSION "$euno_version"
ENV PORT 8080
ENV HOST 0.0.0.0
ENV DATA_PATH "${rootdatadir}/utxodb"
ENV RPC_USER "$rpc_username"
ENV RPC_PASS "$rpc_password"
ENV OFFLINE_MODE "$offline"
ENV RUN_TESTS 1

RUN if [ "$use_testnet" = "0" ] && [ "$use_regtest" = "0" ]; \
    then \
      echo 'export RPC_PORT="14022"' >> ~/env; \
      echo 'export EUNO_NETWORK="livenet"' >> ~/env; \
    elif [ "$use_testnet" = "1" ] && [ "$use_regtest" = "0" ]; \
    then \
      echo 'export RPC_PORT="14023"' >> ~/env; \
      echo 'export EUNO_NETWORK="testnet"' >> ~/env; \
    elif [ "$use_testnet" = "0" ] && [ "$use_regtest" = "1" ]; \
    then \
      echo 'export RPC_PORT="18443"' >> ~/env; \
      echo 'export EUNO_NETWORK="regtest"' >> ~/env; \
      echo "export REGTEST_SIMULATE_MINING=\"$regtest_simulate_mining\"" >> ~/env; \
    else \
      echo 'export RPC_PORT=""' >> ~/env; \
      echo 'export EUNO_NETWORK=""' >> ~/env; \
    fi

# Allow Communications:
#         p2p mainnet   rpc mainnet   p2p testnet   rpc testnet    p2p regtest    rpc regtest 
EXPOSE    46462/tcp     46463/tcp     12026/tcp     46465/tcp      18444/tcp      18443/tcp

#         Rosetta HTTP Node
EXPOSE    8080/tcp

# Create symlinks shouldn't be needed as they're installed in /usr/local/bin/
#RUN ln -s /usr/local/bin/digibyted /usr/bin/digibyted
#RUN ln -s /usr/local/bin/digibyte-cli /usr/bin/digibyte-cli

COPY docker-entrypoint.sh "${ROOTDATADIR}/docker_entrypoint.sh"

ENTRYPOINT ["./docker_entrypoint.sh"]