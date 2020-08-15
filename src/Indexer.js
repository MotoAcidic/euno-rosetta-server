
const EventEmitter = require('events');
const level = require('level');
const JSBinType = require('js-binary').Type;

const syncBlockCache = require('./syncBlockCache');

const BLOCK_BATCH_SIZE = 200;
const TX_BATCH_SIZE = 20000;
const SATOSHI = 100000000;

const SymbolSchema = new JSBinType({
  'symbol': 'uint',
});

const UtxoValueSchema = new JSBinType({
  'sats': 'float',
  'createdOnBlock': 'uint',
  'spentOnBlock?': 'uint',
  'spentInTx?': 'uint',
});

const UtxoKeySchema = new JSBinType({
  'txSymbol': 'uint',
  'n': 'uint',
});

const AddressValueSchema = new JSBinType({
  'txSymbol': ['uint'],
  'vout': ['uint'],
});

const EMPTY_UTXO_LIST = AddressValueSchema.encode({
  txSymbol: [],
  vout: [],
});

const PREFIX_BLOCK_SYM     = 'B';
const PREFIX_TX_SYM        = 'T';
const PREFIX_UTXO          = 'U';
const PREFIX_ADDRESS_UTXOS = 'X';

const VALID_PREFIXES = [
  PREFIX_BLOCK_SYM,
  PREFIX_TX_SYM,
  PREFIX_UTXO,
  PREFIX_ADDRESS_UTXOS
];

const convertToSatoshis = (value) => {
  const ret = Math.floor(value * SATOSHI);
  return ret;
}

const encodeSymbol = (symbol) => {
  return SymbolSchema.encode({ symbol });
};

const decodeSymbol = (buffer) => {
  const decoded = SymbolSchema.decode(buffer);
  return parseInt(decoded.symbol);
};

const returnSymbol = (symbol) => {
  if (symbol == null) return null;
  if (Buffer.isBuffer(symbol)) return decodeSymbol(symbol);
  if (typeof symbol == 'number') return symbol;
  return parseInt(symbol);
};

const hexToBin = (hexString) => {
  if (typeof hexString !== 'string' || hexString.length == 0) {
    throw new Error('No valid string');
  }
  
  const ret = Buffer.from(hexString, 'hex');
  return ret;
}

const serializeAddress = (address) => {
  return address;
}

class DatabaseWrapper {
  constructor(dbInstance, namespace, prefix) {
    this.dbInstance = dbInstance;
    this.namespace = namespace;
    this.prefix = prefix;
  }

  _prefixKey(data) {
    const type = this.prefix;

    if (type == null) throw new Error('Type must not be null');
    if (!VALID_PREFIXES.includes(type)) throw new Error(`Type must be one of ${VALID_PREFIXES}`);
    if (!data) throw new Error(`Data ${data} is invalid`);

    if (Buffer.isBuffer(data)) {
      return Buffer.concat([Buffer.from(type), data]);

    } else if (typeof data == 'string') {
      return `${type}${data}`;

    } else {
      throw new Error(`Unsupported datatype ${typeof data}`);
    }
  };

  async get(key) {
    const prefixedKey = this._prefixKey(key);
    return await this.dbInstance.get(prefixedKey);
  }

  process(operation) {
    operation.key = this._prefixKey(operation.key);
    return operation;
  }

  processList(operations = []) {
    // We do not create a copy of the operations to improve efficiency.
    const prefixedOperations = operations.map(this.process.bind(this)); 

    return prefixedOperations;    
  }

  // async batch(operations = []) {
  //   const prefixedOperations = this.processList(operations);

  //   console.log(typeof operations, typeof prefixedOperations)
  //   return await this.dbInstance.batch(prefixedOperations);
  // }
}

class Indexer {
  constructor(config = {}) {
    if (typeof config.path !== 'string' || config.path.length == 0) {
      throw new Error('DB path not valid');
    }

    this.path = config.path;
    this.db = {};
    this._db = null;

    this.genesisBlockHash = undefined;
    this.bestBlockHash = undefined;
    this.lastBlockSymbol = undefined;
    this.lastTxSymbol = undefined;

    this.genesisBlockHashUpdated = false;

    this.workQueue = [];
    this.dbBatches = {};
    this.workerActive = false;

    this.lastSeenBlockHashes = {};
    this.lastSeenTxHashes = {};
    this.lastSeenUtxos = {};
    this.lastAddressUtxos = {};

		this.events = new EventEmitter();
  }

  createDatabase() {
    const options = {
      valueEncoding: 'binary',
      keyEncoding: 'binary',
    };

    const name = 'utxo';
    this._db = level(`${this.path}/${name}`, options);
  }

  createDatabaseInfo(key, type) {
    this.dbBatches[key] = []; // ops

    this.db[key] = new DatabaseWrapper(this._db, key, type);
  }

  saveState() {
		return new Promise(async (fulfill, reject) => {	
			if (this.workerActive) {
			  // Wait for worker to finish
			  const handler = async () => {
					await this.processBatches();
					this.events.removeListener('worker:quit', handler);
					fulfill();
				};

	 			this.events.on('worker:quit', handler);
				return;
			}

			await this.processBatches();
			fulfill();
		});
  }

  handleBlock(block, removed = false) {
	  if (removed) { console.log('REMOVE', block.index, block.hash); return }
    const blockHash = block.block_identifier.hash;
    const blockData = syncBlockCache.get(blockHash);

    if (!blockData) {
      throw new Error(`CRITICAL: No data found in SyncBlockCache for ${blockHash}`);
    }

    this.workQueue.push(blockData);
    this.worker();
  }

  async worker() {
    if (this.workerActive || this.workQueue.length == 0) return;
    this.workerActive = true;

    try {
      while(this.workQueue.length > 0) {
        const block = this.workQueue.shift();

        if (this.genesisBlockHash == null) {
          // Expect a genesis block

          if (block.height == 0) {
            // Remember the genesisBlockHash
            this.genesisBlockHash = block.hash;
            this.genesisBlockHashUpdated = true;

          } else {
            throw new Error(`CRITICAL: No Genesis Block was passed to Indexer.`);
          }

        } else {
          // Skip this block if it already exists in the database
          const blockExists = await this.getBlockSymbol(block.hash);
          if (blockExists != null) {
            console.log(`Block ${block.hash} exists (sym = ${blockExists})`);
            continue;
          }

          // Check if the previous block was already processed
          const previousBlockHash = block.previousblockhash;
          const previousBlockExists = await this.getBlockSymbol(previousBlockHash);
          if (previousBlockExists == null && block.height != 0) {
            throw new Error(`Previous block ${previousBlockHash} does not exist`);
          }
        }

        // Update the database
        this.bestBlockHash = block.hash;
        await this.saveBlock(block);

        // if (block.height % 100 == 0 && block.height != 0)
        //   console.log(`Synched blocks ${block.height - 100}-${block.height}`);
      }
    } catch (e) {
      console.error('worker', e);
      process.exit(1);

    } finally {
      this.workerActive = false;
	 		this.events.emit('worker:quit');		
    }
  }

  async writeBatches(batches) {
    await this._db.batch(batches);

    // Reset last seen
    this.lastSeenBlockHashes = {};
    this.lastSeenTxHashes = {};
    this.lastSeenUtxos = {};
    this.lastAddressUtxos = {};  

    batches.length = 0;  
  }

  async processBatches() {
    const batchedOperations = [];

    await Promise.all([
      this.processBatchedUtxoLists(batchedOperations),
      this.processBatchedBlockSymbols(batchedOperations),
      this.processBatchedTxSymbols(batchedOperations),
      this.processBatchedUtxos(batchedOperations),
      this.processMetadata(batchedOperations),
    ]);

    await this.writeBatches(batchedOperations);
    // console.log('VERBOSE: Metadata saved');

    batchedOperations.length = 0;
  }

  async processBatchesIfNeeded() {
    const batchCriterion = (this.dbBatches['block-sym'].length >= BLOCK_BATCH_SIZE || 
      this.dbBatches['tx-sym'].length >= TX_BATCH_SIZE);
    const timeCriterion = false; // ToDo

    if (batchCriterion || timeCriterion) {
      await this.processBatches();
    }
  }

  async saveBlock(block) {
    this.lastBlockSymbol = block.height;

    await Promise.all([
      this.batchBlockSymbol(block.hash, block.height),
      this.batchBlockTxs(block, this.lastBlockSymbol),
    ]);

    await this.processBatchesIfNeeded();
  }

  async processBatchedUtxoLists(list) {
    for (let address of Object.keys(this.lastAddressUtxos)) {
      // Get the recent address utxos
      const utxoList = this.lastAddressUtxos[address];

      // Serialize the address and get the existing address utxos
      const serializedAddress = serializeAddress(address);
      const serializedUtxoList = await this.db['address-utxos'].get(serializedAddress)
        .catch(e => EMPTY_UTXO_LIST);

      // Decode the existing structure
      const deserializedUtxoList = AddressValueSchema.decode(serializedUtxoList);

      // Concatenate existing utxos with new utxos
      deserializedUtxoList.txSymbol = deserializedUtxoList.txSymbol.concat(utxoList.txSymbol);
      deserializedUtxoList.vout = deserializedUtxoList.vout.concat(utxoList.vout);

      // Create database operation
      const operation = {
        type: 'put',
        key: serializedAddress,
        value: AddressValueSchema.encode(deserializedUtxoList),
      };

      // Add to batch
      list.push(
        // Converts key to prefixed key
        this.db['address-utxos'].process(operation)
      );
    }
  }

  processBatchedUtxos(list) {
    const ops = this.dbBatches['utxo'];
    const operations = this.db['utxo'].processList(ops);

    list.push(...operations);
    ops.length = 0;
  }

  processBatchedTxSymbols(list) {
    const ops = this.dbBatches['tx-sym'];
    const operations = this.db['tx-sym'].processList(ops);

    list.push(...operations);
    ops.length = 0;
  }

  processBatchedBlockSymbols(list) {
    const ops = this.dbBatches['block-sym'];
    const operations = this.db['block-sym'].processList(ops);

    list.push(...operations);
    ops.length = 0;
  }

  processMetadata(list) {
    const ops = [
      {
        type: 'put',
        key: Buffer.from('bestBlockHash'),
        value: this.bestBlockHash,
      },
      {
        type: 'put',
        key: Buffer.from('latestBlockSymbol'),
        value: encodeSymbol(this.lastBlockSymbol),
      },
      {
        type: 'put',
        key: Buffer.from('latestTxSymbol'),
        value: encodeSymbol(this.lastTxSymbol),
      },
    ];

    if (this.genesisBlockHashUpdated) {
      ops.push({
        type: 'put',
        key: Buffer.from('genesisBlockHash'),
        value: this.genesisBlockHash
      });

      this.genesisBlockHashUpdated = false;
    }

    list.push(...ops);
  }

  async batchBlockTxs(block, blockSymbol) {
    const transactions = block.tx;
    const ops = this.dbBatches['tx-sym'];

    for (let tx of transactions) {
      // Skip if already exists.
      const txSymbol = await this.getTxSymbol(tx.txid);
      if (txSymbol != null) {
        console.error(`Skipping because tx ${tx.txid} already processed`);
      }

      // Get next tx symbol
      this.lastTxSymbol = this.lastTxSymbol + 1;
      this.lastSeenTxHashes[tx.txid] = this.lastTxSymbol;

      ops.push({
        type: 'put',
        key: hexToBin(tx.txid),
        value: encodeSymbol(this.lastTxSymbol),
      });

      await this.batchTransactionInputs(tx, this.lastTxSymbol, blockSymbol);
      await this.batchTransactionOutputs(tx, this.lastTxSymbol, blockSymbol);
    }
  }

  serializeUtxoKey(txSymbol, n) {
    return UtxoKeySchema.encode({
      txSymbol,
      n,
    });
  }

  serializeUtxoValue(sats, createdOnBlock, spentInTx, spentOnBlock) {
    const encoded = UtxoValueSchema.encode({
      sats,
      createdOnBlock,
      spentOnBlock,
      spentInTx,
    });

    return encoded;
  }

  async utxoExistsBySymbol(txSymbol, vout) {
    // 1. Step: Check args 
    if (txSymbol == null) {
      console.error(`Null passed to utxoExistsBySymbol`); 
      return null;
    }

    // 2. Step: Generate the binary utxo key 
    const key = this.serializeUtxoKey(txSymbol, vout);

    // 3. Step: Fetch from database using generated key
    const value = await this.db['utxo'].get(key)
      .catch(e => null);

    if (value == null) {
      console.error('Could not find utxo in utxo db');
      return null;
    }

    // 4. Step: Return key and value
    return {
      key,
      value: Buffer.from(value),
      symbol: txSymbol,
    };
  }

  async utxoExists(txid, vout) {
    // Lookup in utxo cache
    let data = this.lastSeenUtxos[`${txid}:${vout}`];
    if (data != null) {
      // console.log(`Found utxo ${txid}:${vout} in utxo cache.`);
      return {
        symbol: data.txSymbol,
        value: this.serializeUtxoValue(data.sats, data.block, data.spentInTx, data.spentOnBlock),
        key: this.serializeUtxoKey(data.txSymbol, data.n),
      };
    }

    // console.log(`Looking into utxo db for ${txid}:${vout}...`);
    const txSymbol = await this.getTxSymbol(txid);
    return await this.utxoExistsBySymbol(txSymbol, vout);
  }

  async invalidateUtxo(txid, vout, sats, blockSymbol, spentInTx, spentOnBlock, serializedKey = null) {
    const ops = this.dbBatches['utxo'];

    // Step 1: Get binary encoding and retrieve the updated utxo value
    const key = serializedKey || this.serializeUtxoKey(spentInTx, vout);
    const value = this.serializeUtxoValue(sats, blockSymbol, spentInTx, spentOnBlock);

    // Step 2: Add the updated utxo to the batch queue
    ops.push({
      type: 'put',
      key,
      value,
    });

    // Step 3: Add to last seen
    const identifier = `${txid}:${vout}`;
    const existing = this.lastSeenUtxos[identifier] || {};

    // Patch
    Object.assign(existing, {
      txSymbol: spentInTx,
      txid: txid,
      n: vout,
      block: blockSymbol,
      sats,
      spentInTx,
      spentOnBlock,
    });

    this.lastSeenUtxos[identifier] = existing;
  }

  async batchTransactionInputs(tx, txSymbol, blockSymbol) {
    for (let input of tx.vin) {
      // 1. Step: Check if utxo exists
      const { txid, vout, coinbase } = input;

      if (!txid || vout == null) {
        if (!coinbase) throw new Error(`Invalid input @ blockSymbol = ${blockSymbol}`);
        continue;
      }

      const pair = await this.utxoExists(txid, vout);
      if (pair == null) {
        throw new Error(`Blockchain error. Utxo ${txid}:${vout} does not exist.`);
      }

      // 2. Step: Invalidate utxo.
      // This will set the keys `spentOnBlock`, `spentInTx` symbols of the current utxo.
      const decoded = UtxoValueSchema.decode(pair.value);
      await this.invalidateUtxo(txid, vout, decoded.sats, blockSymbol, txSymbol, blockSymbol, pair.key);
    }
  }

  async batchTransactionOutputs(tx, txSymbol, blockSymbol) {
    const ops = this.dbBatches['utxo'];

    // Get binary encodings
    const kvPairs = tx.vout.map(out => {
      const sats = convertToSatoshis(out.value);

      return {
        key: this.serializeUtxoKey(txSymbol, out.n),
        value: this.serializeUtxoValue(sats, blockSymbol),

        // Store original data
        txid: tx.txid,
        n: out.n,
        sats,
        output: out,
      };
    });

    // Add each utxo to the batch queue
    for (let pair of kvPairs) {
      ops.push({
        type: 'put',
        key: pair.key,
        value: pair.value,
      });

      const identifier = `${pair.txid}:${pair.n}`;
      if (this.lastSeenUtxos[identifier]) {
        throw new Error('UTXO should only exist once');
      }

      this.lastSeenUtxos[identifier] = {
        txSymbol,
        txid: pair.txid,
        block: blockSymbol,
        n: pair.n,
        sats: pair.sats,
      };

      await this.batchUtxoAdditionToAddress(tx, txSymbol, pair.output);
    }
  }

  async batchUtxoAdditionToAddress(tx, txSymbol, output) {
    // Add UTXO to address
    if (!output.scriptPubKey ||
        !Array.isArray(output.scriptPubKey.addresses) || 
        output.scriptPubKey.addresses.length != 1) {
      return;
    }

    const address = output.scriptPubKey.addresses[0];
    const utxoList = this.lastAddressUtxos[address] || {
      txSymbol: [],
      vout: [],
    };

    // Add the utxo to the list
    utxoList.txSymbol.push(txSymbol);
    utxoList.vout.push(output.n);

    this.lastAddressUtxos[address] = utxoList;
  }

  async batchUtxoRemovalFromAddress(tx, txSymbol, output) {
    // Remove UTXO from address
    if (!output.scriptPubKey ||
        !Array.isArray(output.scriptPubKey.addresses) || 
        output.scriptPubKey.addresses.length != 1) {
      return;
    }

    const address = output.scriptPubKey.addresses[0];
    console.log('REORG REMOVAL', tx.txid);
  }

  async batchBlockSymbol(hash, blockSymbol) {
    this.lastSeenBlockHashes[hash] = blockSymbol;

    this.dbBatches['block-sym'].push({
      type: 'put',
      key: hexToBin(hash),
      value: encodeSymbol(blockSymbol),
    });
  }

  async getBlockSymbol(hash) {
    // Return symbol from the last seen cache.
    // console.log(hash); 
    const isLastSeen = this.lastSeenBlockHashes[hash];
    if (isLastSeen != null) return isLastSeen;

    const encodedSymbol = await this.db['block-sym'].get(hexToBin(hash))
      .catch(e => null);

    return returnSymbol(encodedSymbol);
  }

  async getTxSymbol(hash) {
    // Return symbol from the last seen cache.
    const isLastSeen = this.lastSeenTxHashes[hash];
    if (isLastSeen != null) return isLastSeen;

    const encodedSymbol = await this.db['tx-sym'].get(hexToBin(hash))
      .catch(e => null);

    return returnSymbol(encodedSymbol);
  }

  async getAccountBalance(address, atBlock = null) {
    try {
      let blockSymbol;
      let blockHash;

      if (typeof atBlock == 'number') {
        blockSymbol = atBlock;

        if (blockSymbol < this.lastBlockSymbol) {
          throw new Error(
            `Block height ${atBlock} is not available.`
            + ` Node to ${this.this.lastBlockSymbol}.`
          );
        }

      } else if (typeof atBlock == 'string') {
        // lookup
        blockSymbol = this.getBlockSymbol(atBlock);

        if (blockSymbol == null)
          throw new Error(`No block found for hash ${atBlock}`);
      }

      // If no block was specified, use the most recent one
      if (!blockSymbol) {
        blockSymbol = this.lastBlockSymbol;
        blockHash = this.bestBlockHash;
      }

      const utxos = await this.db['address-utxos'].get(serializeAddress(address));
      const utxoList = AddressValueSchema.decode(utxos);
      let balance = 0;

      for (let i = 0; i < utxoList.txSymbol.length; ++i) {
        const symbol = utxoList.txSymbol[i];
        const vout = utxoList.vout[i];

        const utxo = await this.utxoExistsBySymbol(symbol, vout);
        if (!utxo) {
          throw new Error(`Could not find utxo ${symbol}:${vout}`);
        }

        const decodedUtxo = UtxoValueSchema.decode(utxo.value);

        // Skip if utxo does not exist at specified block
        if (decodedUtxo.createdOnBlock > blockSymbol) {
          continue;
        }

        // Skip if spent before specified block
        if (decodedUtxo.spentOnBlock != null && blockSymbol > decodedUtxo.spentOnBlock) {
          continue;
        }

        balance += decodedUtxo.sats;
      }

      return {
        balance,
        blockSymbol,
        blockHash,
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async initBestBlockHash() {
    try {
      const bestBlockHash = await this._db.get('bestBlockHash');
      this.bestBlockHash = bestBlockHash;
    } catch (e) {
      this.bestBlockHash = null;
    }    
  }

  async initGenesisHash() {
    try {
      const genesisBlockHash = await this._db.get('genesisBlockHash');
      this.genesisBlockHash = genesisBlockHash;
    } catch (e) {
      this.genesisBlockHash = null;
    }    
  }

  async initBlockSymbol() {
    try {
      const blockSymbol = await this._db.get('latestBlockSymbol');
      this.lastBlockSymbol = returnSymbol(blockSymbol);
    } catch (e) {
      console.error(e);
      this.lastBlockSymbol = -1;
    }    
  }

  async initTxSymbol() {
    try {
      const txSymbol = await this._db.get('latestTxSymbol');
      this.lastTxSymbol = returnSymbol(txSymbol);
    } catch (e) {
      this.lastTxSymbol = -1;
    }    
  }

  checkFeatures(db) {
    if (!db.supports.permanence) {
      throw new Error('Persistent storage is required');
    }

    if (!db.supports.bufferKeys || !db.supports.promises) {
      throw new Error('Promises and BufferKeys are required');
    }
  }

  async initIndexer(genesisBlockHash) {
    this.createDatabase();
    this.checkFeatures(this._db);

    // this.createDatabase('metadata');
    this.createDatabaseInfo('block-sym', PREFIX_BLOCK_SYM);
    this.createDatabaseInfo('tx-sym', PREFIX_TX_SYM);
    this.createDatabaseInfo('utxo', PREFIX_UTXO);
    this.createDatabaseInfo('address-utxos', PREFIX_ADDRESS_UTXOS);

    await this.initBestBlockHash();
    await this.initGenesisHash();
    await this.initBlockSymbol();
    await this.initTxSymbol();

    // console.log({
    //   lastBlockSymbol: this.lastBlockSymbol,
    //   lastTxSymbol: this.lastTxSymbol,
    //   genesisBlockHash: this.genesisBlockHash,
    //   bestBlockHash: this.bestBlockHash,
    // });
  }
}

module.exports = Indexer;