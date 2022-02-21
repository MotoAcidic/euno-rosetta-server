const config = require('../config/index.js');
const Indexer = require('./Indexer');

const EunoPayIndexer = new Indexer(config.data);
module.exports = EunoPayIndexer;