FROM ubuntu:18.04
USER root
WORKDIR /data

ARG DEBIAN_FRONTEND=noninteractive
ARG euno_version=7.17.2

# Install essential dependencies for the build project.
RUN apt-get update && apt-get -y upgrade \
  && apt-get install -y wget git build-essential libtool autotools-dev automake \
  && apt-get install -y nodejs-dev node-gyp npm \
  && npm install -g n \
  && n latest \
  && npm install -g npm \
  && npm i \
  && apt install -y libssl1.0-dev \
  && apt install -y libevent-dev \
  && apt install -y bsdmainutil \
  && add-apt-repository ppa:deadsnakes/ppa apt update python3.8 -y \
  && apt install -y libgmp-dev \
  && apt install -y libboost-system-dev \
  && apt install -y libboost-filesystem-dev \
  && apt install -y libboost-chrono-dev \
  && apt install -y libboost-program-options-dev \
  && apt install -y libboost-test-dev \
  && apt install -y libboost-thread-dev \
  && apt install -y libboost-iostreams-dev \
  && apt install -y libdb-dev \
  && apt install -y libdb++-dev \
  && apt-get clean

 # && apt-get install -y git unzip build-essential libdb++-dev libboost-all-dev libqrencode-dev libminiupnpc-dev libevent-dev autogen automake libtool libqt5gui5 libqt5core5a libqt5dbus5 qttools5-dev qttools5-dev-tools qt5-default bsdmainutils openssl libssl1.0-dev libzmq3-dev libgmp-dev nodejs-dev node-gyp npm \
 # && apt-get -y install git \
 # && apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates \
 # && curl -sL https://deb.nodesource.com/setup_12.x \
 # && apt -y install nodejs \
 # && apt -y  install gcc g++ make


# Clone the Core wallet source from GitHub and checkout the version.
RUN git clone https://github.com/MotoAcidic/eunowallet/

# Prepare the build process with autgen and configure
ARG rootdatadir=/data
RUN cd ${rootdatadir}/eunowallet && ./autogen.sh && ./configure --with-incompatible-bdb --without-gui

# Finsh the build process with the make
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