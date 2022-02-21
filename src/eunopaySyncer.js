/* Singleton module for Syncer */
const config = require('../config');
const Syncer = require('./Syncer');
const EunoPayIndexer = require('./eunopayIndexer');

console.log('entered the syncer module.')
const EunoPaySyncer = new Syncer(config.syncer, EunoPayIndexer);
console.log('Made it past syncer')
module.exports = EunoPaySyncer;
