const RosettaSDK = require('rosetta-node-sdk');
const serverConfig = require('./serverConfig');
const crypto = require('crypto');
const consoleDebug = require('../debug')

const DEFAULT_LISTENING_HOST = '127.0.0.1';
const DEFAULT_ROSETTA_VERSION = '1.3.1';
const DEFAULT_EUNO_VERSION = '2.2.0';
const DEFAULT_RPC_PORT = 46463;
const DEFAULT_RPC_USER = 'test';
const DEFAULT_RPC_PASS = 'testing';
const DEFAULT_RPC_HOST = '127.0.0.1';
const DEFAULT_RPC_PROTO = 'http';
const DEFAULT_EXPLORER = 'https://explorer.euno.co/api/'
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
const syncerSecret = crypto.randomBytes(128).toString('hex');

const config = {
  version: '1.0.0',
  rosettaVersion: DEFAULT_ROSETTA_VERSION,
  eunoVersion: DEFAULT_EUNO_VERSION,
  port: DEFAULT_LISTENING_PORT,
  host: DEFAULT_LISTENING_HOST,
  explorer: DEFAULT_EXPLORER,
  offline: !!parseInt(process.env.OFFLINE_MODE),

    rpchost: DEFAULT_RPC_HOST,
    rpcuser: DEFAULT_RPC_USER,
    rpcpass: DEFAULT_RPC_PASS,
    rpcport: DEFAULT_RPC_PORT,

  data: {
    path: DEFAULT_DATA_PATH,
  },

  rpc: {
    rpc_port: DEFAULT_RPC_PORT,
    rpc_user: DEFAULT_RPC_USER,
    rpc_pass: DEFAULT_RPC_PASS,
    rpc_host: DEFAULT_RPC_HOST,
    rpc_proto: DEFAULT_RPC_PROTO,
  },

  network: DEFAULT_EUNO_NETWORK,
  syncer: {},
  serverConfig,

  connection: DEFAULT_CONNECTION,
};

consoleDebug.group('This is only a sanity check to see what values are being passed.')
consoleDebug.log({
    Version: config.version,
    RVersion: config.rosettaVersion,
    EVersion: config.eunoVersion,
    Port: config.port,
    Host: config.host,
    DataPath: config.data,
    RPC: config.rpc,
    Network: config.network,
    Connection: config.connection
})
consoleDebug.groupEnd()

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
