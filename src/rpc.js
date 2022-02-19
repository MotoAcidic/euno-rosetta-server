const RPCClient = require('bitcoind-rpc');
const Bluebird = require('bluebird');
const axios = require('axios');
const Config = require('../config');
const { config } = require('bluebird');

const rpcConfig = {
    protocol: Config.rpc.rpc_proto,
    user: Config.rpc.rpc_user,
    pass: Config.rpc.rpc_pass,
    host: Config.rpc.rpc_host,
    port: Config.rpc.rpc_port,
};

if (Config.connection == 'eunopay' || Config.connection == 'eunopayLocal') {
    const baseURL = (Config.connection == 'eunopay' ? 'http://localhost:8080' : 'https://explorer.euno.co/api/')
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