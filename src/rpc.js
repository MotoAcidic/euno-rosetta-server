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

    get_block_count: function () {
        return new Promise((resolve, reject) => {
            localClient.getblockcount(function (error, result) {
                if (error) {
                    var errorMessage = "Unable to get block count with (127.0.0.1:8080/getblockcount)";
                    console.log(errorMessage);
                    resolve('error');
                } else {
                    resolve(result);
                }
            });
        });
    },

    get_info: function () {
        return new Promise((resolve, reject) => {
            localClient.getinfo(function (error, result) {
                if (error) {
                    var errorMessage = "Unable to get wallet info with (127.0.0.1:8080/getinfo)";
                    console.log(errorMessage);
                    resolve('error');
                } else {
                    resolve(result);
                }
            });
        });
    },

};

/**
if (Config.connection == 'eunopay' || Config.connection == 'eunopayLocal') {
    const baseURL = (Config.connection == 'eunopay' ? 'http://0.0.0.0:8080' : 'http://127.0.0.1:8080')
    const getBlockCountAsync = async () => {
        const result = await axios.get(`${baseURL}/getblockcount`).catch(error => {
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