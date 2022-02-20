const RPCClient = require('bitcoind-rpc');
const Client = require('coinpoolservices-rpc');
const Bluebird = require('bluebird');
const axios = require('axios');
const Config = require('../config/index.js');
const { config } = require('bluebird');

const rpcConfig = {
    protocol: Config.rpc.rpc_proto,
    user: Config.rpc.rpc_user,
    pass: Config.rpc.rpc_pass,
    host: Config.rpc.rpc_host,
    port: Config.rpc.rpc_port,
};


// Lets create a new local client connection
const localClient = new Client({
    host: Config.rpc.rpc_host,
    username: Config.rpc.rpc_user,
    password: Config.rpc.rpc_pass,
    port: Config.rpc.rpc_port
});

module.exports = {
    // Get the block chain info in one call to get block height and hash
    get_chain_info: function () {
        return new Promise((resolve, reject) => {
            localClient.getBlockchainInfo(function (error, result) {
                if (error) {
                    console.log("get_chain_info: Wallet query problem. (getBlockchainInfo)");
                    resolve('error');
                } else {
                    resolve(result);
                }
            });
        });
    },

    // Get the block height based on the hash provided
    get_block: function (hash) {
        return new Promise((resolve, reject) => {
            localClient.getBlock(hash, function (error, result) {
                if (error) {
                    console.log("get_block: Wallet query problem. (getblock hash)");
                    resolve('error');
                } else {
                    resolve(result);
                }
            });
        });
    },

    // Get the hash of the provided block height
    get_block_hash: function (block) {
        return new Promise((resolve, reject) => {
            localClient.getBlock(block, function (error, result) {
                if (error) {
                    console.log("get_block_hash: Wallet query problem. (getblock number)");
                    resolve('error');
                } else {
                    resolve(result);
                }
            });
        });
    },

    // Get connected peer info
    get_peer_info: function () {
        return new Promise((resolve, reject) => {
            localClient.getblockhash(function (error, result) {
                if (error) {
                    console.log("get_peer_info: Wallet query problem. (getpeerinfo)");
                    resolve('error');
                } else {
                    resolve(result);
                }
            });
        });
    },
}


/**
if (Config.connection == 'eunopay' || Config.connection == 'eunopayLocal') {
    const baseURL = (Config.rpc.rpc_host)
        const result = await axios.get(`${baseURL}/getblockcount`).catch(error => {
        const result = await testResult.catch(error => {
            throw error;
        });
        if (result.data.status === "success" && result.data.data) {
            return { result: result.data.data }
        }
        throw "Unable to get block count"
    };
    const getBlockHashAsync = async (block) => {
        const result = await axios.get(`${baseURL}/getblockhash?index=${block}`).catch(error => {
            throw error;
        });
        if (result.data.status === "success" && result.data.data) {
            return { result: result.data.data }
        }
        throw "Unable to get block hash"
    };
    const getBlockAsync = async (block, verbosity = 2) => {
        const result = await axios.get(`${baseURL}/getblock?hashheight=${block}&verbosity=${verbosity}`).catch(error => {
            throw error;
        });
        if (result.data.status === "success" && result.data.data) {
            return { result: result.data.data }
        }
        throw "Unable to get block"
    };
    const getRawMemPoolAsync = async () => {
        const result = await axios.get(`${baseURL}/getrawmempool?verbose=true`).catch(error => {
            throw error;
        });
        if (result.data.status === "success" && result.data.data) {
            return { result: result.data.data }
        }
        throw "Unable to get raw mempool"
    };
    const sendRawTransactionAsync = async (tx) => {
        const result = await axios.get(`${baseURL}/sendrawtransaction?hexstring=${tx}&allowhighfees=true`).catch(error => {
            throw error;
        });
        if (result.data.status === "success" && result.data.data) {
            return { result: result.data.data }
        }
        throw "Unable to send raw transaction"
    };
    const getRawTransactionAsync = async (txid, verbose) => {
        const result = await axios.get(`${baseURL}/getrawtransaction?txid=${txid}&verbose=${verbose}`).catch(error => {
            throw error;
        });
        if (result.data.status === "success" && result.data.data) {
            return { result: result.data.data }
        }
        throw "Unable to get raw transaction"
    };
    const getBlockchainInfoAsync = async () => {
        const result = await axios.get(`${baseURL}/getblockchaininfo`).catch(error => {
            throw error;
        });
        if (result.data.status === "success" && result.data.data) {
            return { result: result.data.data }
        }
        throw "Unable to get blockchain info"
    };
    const getPeerInfoAsync = async () => {
        const result = await axios.get(`${baseURL}/getpeerinfo`).catch(error => {
            throw error;
        });
        if (result.data.status === "success" && result.data.data) {
            return { result: result.data.data }
        }
        throw "Unable to get peer info"
    };
    module.exports = {
        getBlockCountAsync,
        getBlockHashAsync,
        getBlockAsync,
        getRawMemPoolAsync,
        sendRawTransactionAsync,
        getRawTransactionAsync,
        getBlockchainInfoAsync,
        getPeerInfoAsync,
    };
} else {
    const rpc = new RPCClient(rpcConfig);
    Bluebird.promisifyAll(rpc);

    module.exports = rpc;
}
*/