#!/bin/sh

# Load environment variables
cat ~/env
. ~/env

set -e

DATA_DIR="$ROOTDATADIR"
NODE_DIR="$ROSETTADIR"

wait_for_eunod()
{
    set +e

    echo "Connecting to RPC with "\
        "rpcuser=$RPC_USER" \
        "rpcpassword=$RPC_PASS" \
        "rpcport=$RPC_PORT"

    while true; do
        euno-cli \
            -rpcuser="$RPC_USER" \
            -rpcpassword="$RPC_PASS" \
            -rpcport="$RPC_PORT" \
            getblockhash 0

        rc=$?

        if [ "$rc" = 0 ]
        then
            break
        else
            echo "Waiting another 30 seconds"
            sleep 30
        fi
    done
    set -e
}

simulate_mining() {
    # Mine to an address
    node1="euno-cli -conf=${DATA_DIR}/euno.conf -datadir=${DATA_DIR}/.eunopay"

    # Generate three addresses
    euno_address1=`$node1 getnewaddress "" bech32`
    euno_address2=`$node1 getnewaddress "" bech32`
    euno_address3=`$node1 getnewaddress "" bech32`
    private_key1=`$node1 dumpprivkey "$euno_address1"`
    private_key2=`$node1 dumpprivkey "$euno_address2"`
    private_key3=`$node1 dumpprivkey "$euno_address3"`    

    echo "PUBLIC_ADDRESS_1:  $euno_address1"
    echo "PUBLIC_ADDRESS_2:  $euno_address2"
    echo "PRIVATE_KEY_1:     $private_key1"
    echo "PRIVATE_KEY_2:     $private_key2"

    # Generate 101 blocks
    hashes=`$node1 generatetoaddress 101 $euno_address1`
    spendable=72000

    # Send some EUNO to another address
    send=$(($spendable - 100))
    txid=`$node1 sendtoaddress $euno_address2 $send`

    # Change to false in order to reproduce the
    # bug mentioned in `Bug.md`.
    USE_SAFE_GENERATE=true
    if $USE_SAFE_GENERATE; then 
        # Generate one more block
        $node1 generate 1
        
        # Send More than 72000 to a third address.
        # This transaction requires a utxo from euno_address2
        txid=`$node1 sendtoaddress $euno_address3 $(($spendable + 10000))`
        $node1 generate 1 
    else
        hash=`$node1 generatetoaddress 1 "$euno_address1" | tr -d '["] '`
        $node1 getblock $hash 2

        txid=`$node1 sendtoaddress $euno_address3 $(($spendable + 10000))`
        hash=`$node1 generatetoaddress 1 "$euno_address1" | tr -d '["] '`
    fi
}

if [ ! -d "$DATA_DIR" ]; then
    echo "Error: $DATA_DIR does not exist. Quitting."
    exit 1
fi

echo "euno.conf contents"
cat "${DATA_DIR}/euno.conf"

echo "Starting eunod..."
eunod \
    -conf="${DATA_DIR}/euno.conf" \
    -datadir="${DATA_DIR}/.eunopay" 

sleep 2

echo "Waiting for eunod to be ready..."
wait_for_eunod

if [ ! -z "$REGTEST_SIMULATE_MINING" ] && [ "$REGTEST_SIMULATE_MINING" -eq 1 ]; then
    # This mines some block and creates several transactions, in which
    # three different addresses are involved.
    simulate_mining
fi

# Switch to rosetta directory
cd "${NODE_DIR}"

# Run automatic tests
if [ ! -z "$RUN_TESTS" ] && [ "$RUN_TESTS" -eq 1 ]; then
    npm run test
fi

# Regular mode
npm run start
