const RosettaSDK = require('rosetta-node-sdk');
const serverConfig = require('./serverConfig');
const crypto = require('crypto');

const DEFAULT_LISTENING_HOST = '127.0.0.1';
const DEFAULT_ROSETTA_VERSION = '1.3.1';
const DEFAULT_EUNO_VERSION = '2.2.0';
const DEFAULT_RPC_PORT = 46463;
const DEFAULT_RPC_USER = 'test';
const DEFAULT_RPC_PASS = 'testing';
const DEFAULT_RPC_HOST = '172.19.214.182';
const DEFAULT_RPC_PROTO = 'http';
const DEFAULT_LISTENING_PORT = 8080;
const DEFAULT_CONNECTION = 'eunopay';
const DEFAULT_DATA_PATH = './data';

/**
(() => {
    const fs = require('fs');
    console.log({
        'files in ./': fs.readdirSync('./'),
        'parent directory': fs.readdirSync('../')
    });
})();
*/

const DEFAULT_EUNO_NETWORK = 'mainnet';
  
/**
 * syncerSecret is used by the Indexer in order to request blocks from 
 * the listening server, that are not yet synced.
 * If the secret is not set in a request, the /block endpoint will
 * return an error (NODE_SYNCING).
 * If the secret is set, a block will be returned with an empty
 * transaction array.
 * A random secret will be used, unless the environment variable
 * SYNCER_SECRET is set.
 */
const syncerSecret = process.env.SYNCER_SECRET ||
  crypto.randomBytes(128).toString('hex');

const config = {
  version: '1.0.0',
  rosettaVersion: RosettaSDK.Version || DEFAULT_ROSETTA_VERSION,
  eunoVersion: process.env.EUNO_VERSION || DEFAULT_EUNO_VERSION,
  port: process.env.PORT || DEFAULT_LISTENING_PORT,
  host: process.env.HOST || DEFAULT_LISTENING_HOST,
  offline: !!parseInt(process.env.OFFLINE_MODE),

  data: {
    path: process.env.DATA_PATH || DEFAULT_DATA_PATH,
  },

  rpc: {
    rpc_port: process.env.RPC_PORT || DEFAULT_RPC_PORT,
    rpc_user: process.env.RPC_USER || DEFAULT_RPC_USER,
    rpc_pass: process.env.RPC_PASS || DEFAULT_RPC_PASS,
    rpc_host: process.env.RPC_HOST || DEFAULT_RPC_HOST,
    rpc_proto: process.env.RPC_PROTO || DEFAULT_RPC_PROTO,
  },

  network: process.env.EUNO_NETWORK || DEFAULT_EUNO_NETWORK,
  syncer: {},
  serverConfig,

  connection: process.env.CONNECTION || DEFAULT_CONNECTION,
};

// Logs to make sure values above are being populated.
console.log({
    Title: "This is only a sanity check to see what values are being passed.",
    Version: config.version,
    RVersion: config.rosettaVersion,
    EVersion: config.eunoVersion,    
    Port: config.port,
    Host: config.host,
    DataPath: config.data,
    RPC: config.rpc,
    Network: config.network,
    Connection: config.connection
});

config.syncer = {
  syncerSecret,

  defaultHeaders: {
    'syncer-secret': syncerSecret,
  },

  // Fetcher config:
  protocol: 'http',
  host: config.host,
  port: config.port,
};

if (!config.rosettaVersion) throw new Error('RosettaVersion not defined');
if (!config.eunoVersion) throw new Error('EUNO_VERSION not set');
if (!config.rpc.rpc_port) throw new Error('RPC_PORT not set');
if (!config.rpc.rpc_user) throw new Error('RPC_USER not set');
if (!config.rpc.rpc_pass) throw new Error('RPC_PASS not set');
if (!config.rpc.rpc_host) throw new Error('RPC_HOST not set');
if (!config.rpc.rpc_proto) throw new Error('RPC_PROTO not set');

module.exports = config;
