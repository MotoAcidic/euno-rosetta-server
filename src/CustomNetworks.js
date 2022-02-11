/* EunoPay Networks Params for Bitcore-lib */

const livenet = {
    name: 'euno_livenet',
    alias: 'euno_mainnet',
    bech32prefix: 'euno',
    pubkeyhash: 0x15,
    privatekey: 0x09,
    scripthash: 0x11,
    stakinghash: 0x3f,
    networkMagic: 0x90c4fde9,
    port: 46462,
    dnsSeeds: [
        'seed.euno.network',
    ],
};

const testnet = {
  name: 'euno_testnet',
  alias: 'euno_testnet',
  bech32prefix: 'teuno',
  pubkeyhash: 0x8b,
  privatekey: 0xef,
  scripthash: 0x13,
  stakinghash: 0x49,
};

module.exports = {
  livenet,
  testnet,
};
