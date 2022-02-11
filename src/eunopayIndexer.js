const config = require('../config');
const Indexer = require('./Indexer');

const EunoPayIndexer = new Indexer(config.data);
module.exports = EunoPayIndexer;
