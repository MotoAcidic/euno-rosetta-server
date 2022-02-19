FROM ubuntu:18.04
USER root
WORKDIR /data

ARG DEBIAN_FRONTEND=noninteractive
# When changing this make sure to change it in /config/index.js as well
ARG euno_version=2.2.0

# Lets make sure our nameservers can communicate back to google dns
# RUN echo "nameserver 8.8.8.8" |sudo tee /etc/resolv.conf > /dev/null

# Install essential dependencies for the build project.
RUN apt-get -qq update \
  && apt-get -qq -y install curl \
  && apt-get -y upgrade \
  && apt-get install -y wget git build-essential libtool autotools-dev automake \
  && apt-get install -y nodejs-dev node-gyp npm \
  && npm install -g n \
  && n latest \
  && npm install -g npm \
  && npm i \
  && apt install -y libssl1.0-dev \
  && apt install -y libevent-dev \
  && apt-get install bsdmainutils \
  && apt-get install -y apt-utils \
  && apt-get install -y libgmp-dev \
  && apt-get install -y libboost-system-dev \
  && apt-get install -y libboost-filesystem-dev \
  && apt-get install -y libboost-chrono-dev \
  && apt-get install -y libboost-program-options-dev \
  && apt-get install -y libboost-test-dev \
  && apt-get install -y libboost-thread-dev \
  && apt-get install -y libboost-iostreams-dev \
  && apt-get install -y libdb-dev \
  && apt-get install -y libdb++-dev \
  && apt-get install -y python3 \
  && apt-get clean

# Clone the Core wallet source from GitHub and checkout the version.
RUN git clone https://github.com/MotoAcidic/eunowallet/

# Prepare the build process with autgen and configure
ARG rootdatadir=/data
RUN cd ${rootdatadir}/eunowallet && ./autogen.sh && ./configure --with-incompatible-bdb

# Finsh the build process with the make
RUN cd ${rootdatadir}/eunowallet && make \
&& make install

# Delete source
#RUN rm -rf ${rootdatadir}/digibyte

# Copy everything over
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
ARG rpc_username=test
ARG rpc_password=testing
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
server=0\n\
prune=${prunesize}\n\
maxconnections=300\n\
rpcallowip=127.0.0.1\n\
rpcuser=${rpc_username}\n\
rpcpassword=${rpc_password}\n\
txindex=0\n\
testnet=${use_testnet}\n\
rpcworkqueue=32\n\
rpcbind=127.0.0.1\n\
listen=1\n" | tee "${rootdatadir}/euno.conf"'

# Set some environment variables
ENV ROOTDATADIR "$rootdatadir"
ENV ROSETTADIR "/root/rosetta-node"
ENV EUNO_VERSION "$euno_version"
ENV PORT 80
ENV HOST "0.0.0.0"
ENV DATA_PATH "${rootdatadir}/utxodb"
ENV RPC_USER "$rpc_username"
ENV RPC_PASS "$rpc_password"
ENV OFFLINE_MODE "$offline"
ENV RUN_TESTS 1

RUN if [ "$use_testnet" = "0" ] && [ "$use_regtest" = "0" ]; \
    then \
      echo 'export RPC_PORT="46465"' >> ~/env; \
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

#         Rosetta HTTP Node  Base 80 port
EXPOSE    8080/tcp           80/tcp

# Create symlinks shouldn't be needed as they're installed in /usr/local/bin/
#RUN ln -s /usr/local/bin/digibyted /usr/bin/digibyted
#RUN ln -s /usr/local/bin/digibyte-cli /usr/bin/digibyte-cli

COPY docker-entrypoint.sh "${ROOTDATADIR}/docker_entrypoint.sh"

ENTRYPOINT ["./docker_entrypoint.sh"]