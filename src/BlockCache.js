/* BlockCache.js */

function BlockCache(space = 1000) {
  if (typeof space !== 'number' || space < 0) throw new Error('Space must be a positive number');

  const map = {};
  const hashes = new Array();

  this.get = (blockHash) => map[blockHash];
    console.log('made it past this garbage pt 1')
  this.put = (blockHash, block) => {
    map[blockHash] = block;
    hashes.push(blockHash);
    this._removeEldest();
  };

  this._removeEldest = () => {
    while (hashes.length > space) {
      const hashToBeRemoved = hashes.shift();
      delete map[hashToBeRemoved];
    }
  };
    console.log('made it past this garbage pt 2')
}

module.exports = BlockCache;
