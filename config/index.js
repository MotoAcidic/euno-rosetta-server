const RosettaSDK = require('rosetta-node-sdk');
const serverConfig = require('./serverConfig');

const DEFAULT_ROSETTA_VERSION = '1.3.1';
const DEFAULT_RPC_PORT = 14022;
const DEFAULT_RPC_USER = 'user';
const DEFAULT_RPC_PASS = 'pass';
const DEFAULT_RPC_HOST = 'localhost';
const DEFAULT_RPC_PROTO = 'http';
const DEFAULT_LISTENING_PORT = 8080;
const DEFAULT_DATA_PATH = './data';
const DEFAULT_DGB_NETWORK = 'livenet';

const config = {
  version: '1.0.0',
  rosettaVersion: RosettaSDK.Version || DEFAULT_ROSETTA_VERSION,
  digibyteVersion: process.env.DGB_VERSION,
  port: process.env.PORT || DEFAULT_LISTENING_PORT,

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

  network: process.env.DGB_NETWORK || DEFAULT_DGB_NETWORK,
  serverConfig: serverConfig,
};

if (!config.rosettaVersion) throw new Error('RosettaVersion not defined');
if (!config.digibyteVersion) throw new Error('DGB_VERSION not set');
if (!config.rpc.rpc_port) throw new Error('RPC_PORT not set');
if (!config.rpc.rpc_user) throw new Error('RPC_USER not set');
if (!config.rpc.rpc_pass) throw new Error('RPC_PASS not set');
if (!config.rpc.rpc_host) throw new Error('RPC_HOST not set');
if (!config.rpc.rpc_proto) throw new Error('RPC_PROTO not set');

module.exports = config;