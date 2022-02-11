const RosettaSDK = require('rosetta-node-sdk');

const Types = RosettaSDK.Client;

const Blockchain = 'EunoPay';
const Network = process.env.DGB_NETWORK || 'livenet';
const networkIdentifier = new Types.NetworkIdentifier(Blockchain, Network);

module.exports = networkIdentifier;
