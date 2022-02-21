const RosettaSDK = require('rosetta-node-sdk');

const Types = RosettaSDK.Client;

const Blockchain = 'EunoPay';
const Network = 'livenet';
console.log('stepping into the network ident')
const networkIdentifier = new Types.NetworkIdentifier(Blockchain, Network);
console.log('made it out of the ident')
module.exports = networkIdentifier;
