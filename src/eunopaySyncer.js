/* Singleton module for Syncer */
const config = require('../config');
const Syncer = require('./Syncer');
const EunoPayIndexer = require('./eunopayIndexer');

const EunoPaySyncer = new Syncer(config.syncer, EunoPayIndexer);
module.exports = EunoPaySyncer;
