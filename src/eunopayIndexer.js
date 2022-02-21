const config = require('../config/index.js');
const Indexer = require('./Indexer');

const EunoPayIndexer = new Indexer(config.data);
console.log('Made it past indexer and moving to src/indexer')
module.exports = EunoPayIndexer;