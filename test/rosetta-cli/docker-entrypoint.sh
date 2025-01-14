#!/bin/sh

# Filename: docker-entrypoint.sh
# Rosetta-CLI testing

# Wait for Rosetta Server to become available
trials=50 # total: 25 sec

wait_for_node() {
    proto=$1
    host=$2
    port=$3
    path=$4

    url="$proto://$host:$port/$path"
    echo "Waiting for Rosetta Node ($url) to become available..."

    # until $(curl --head --fail $url); do
    until $(curl --output /dev/null --silent --fail $url); do
        trials=$(( $trials - 1 ))
        printf '.'

        for i in `seq 1 5`; do
            sleep 1
        done

        if [ "$trials" -le 0 ]; then
            echo "Node not reachable. Exiting..."
            exit 1
        fi
    done

    echo " Node available!"
}

wait_for_node http $OFFLINE_HOST $OFFLINE_PORT "hello"
wait_for_node http $ONLINE_HOST $ONLINE_PORT "hello"

cat << EOF > EunoPay.conf
{
 "network": {
  "blockchain": "EunoPay",
  "network": "regtest"
 },
 "online_url": "http://$ONLINE_HOST:$ONLINE_PORT",
 "data_directory": "/data",
 "http_timeout": 10,
 "sync_concurrency": 8,
 "transaction_concurrency": 16,
 "tip_delay": 300,

 "construction": {
  "offline_url": "http://$OFFLINE_HOST:$OFFLINE_PORT",
  "stale_depth": 0,
  "broadcast_limit": 0,
  "ignore_broadcast_failures": false,
  "clear_broadcasts": false,
  "broadcast_behind_tip": false,
  "block_broadcast_limit": 0,
  "rebroadcast_all": false,
  "workflows": [
   {
    "name": "request_funds",
    "concurrency": 1,
    "scenarios": [
     {
      "name": "find_address",
      "actions": [
       {
        "input": "{\"symbol\":\"EUNO\", \"decimals\":8}",
        "type": "set_variable",
        "output_path": "currency"
       },
       {
        "input": "{\"minimum_balance\":{\"value\": \"0\", \"currency\": {{currency}}}, \"create_limit\":1}",
        "type": "find_balance",
        "output_path": "random_address"
       }
      ]
     },
     {
      "name": "request",
      "actions": [
       {
        "input": "{\"address\": {{random_address.account.address}}, \"minimum_balance\":{\"value\": \"250000000\", \"currency\": {{currency}}}}",
        "type": "find_balance",
        "output_path": "loaded_address"
       }
      ]
     }
    ]
   },
   {
    "name": "create_account",
    "concurrency": 1,
    "scenarios": [
     {
      "name": "create_account",
      "actions": [
       {
        "input": "{\"network\":\"regtest\", \"blockchain\":\"EunoPay\"}",
        "type": "set_variable",
        "output_path": "network"
       },
       {
        "input": "{\"curve_type\": \"secp256k1\"}",
        "type": "generate_key",
        "output_path": "key"
       },
       {
        "input": "{\"network_identifier\": {{network}}, \"public_key\": {{key.public_key}}}",
        "type": "derive",
        "output_path": "address"
       },
       {
        "input": "{\"address\": {{address.address}}, \"keypair\": {{key}}}",
        "type": "save_address"
       }
      ]
     }
    ]
   },
   {
    "name": "transfer",
    "concurrency": 10,
    "scenarios": [
     {
      "name": "transfer",
      "actions": [
       {
        "input": "{\"network\":\"regtest\", \"blockchain\":\"EunoPay\"}",
        "type": "set_variable",
        "output_path": "transfer.network"
       },
       {
        "input": "{\"symbol\":\"EUNO\", \"decimals\":8}",
        "type": "set_variable",
        "output_path": "currency"
       },
       {
        "input": "{\"minimum_balance\":{\"value\": \"250000000\", \"currency\": {{currency}}}}",
        "type": "find_balance",
        "output_path": "sender"
       },
       {
        "input": "\"500000\"",
        "type": "set_variable",
        "output_path": "max_fee"
       },
       {
        "input": "{\"operation\":\"subtraction\", \"left_value\": {{sender.balance.value}}, \"right_value\": {{max_fee}}}",
        "type": "math",
        "output_path": "available_amount"
       },
       {
        "input": "{\"minimum\": \"1\", \"maximum\": {{available_amount}}}",
        "type": "random_number",
        "output_path": "recipient_amount"
       },
       {
        "input": "{\"recipient_amount\":{{recipient_amount}}}",
        "type": "print_message"
       },
       {
        "input": "{\"operation\":\"subtraction\", \"left_value\": \"0\", \"right_value\":{{recipient_amount}}}",
        "type": "math",
        "output_path": "sender_amount"
       },
       {
        "input": "{\"not_address\":[{{sender.account.address}}], \"minimum_balance\":{\"value\": \"0\", \"currency\": {{currency}}}, \"create_limit\": 100, \"create_probability\": 50}",
        "type": "find_balance",
        "output_path": "recipient"
       },
       {
        "input": "\"1\"",
        "type": "set_variable",
        "output_path": "transfer.confirmation_depth"
       },
       {
        "input": "[{\"operation_identifier\":{\"index\":0},\"type\":\"transfer\",\"account\":{\"address\":{{sender.account.address}}},\"amount\":{\"value\":{{sender_amount}},\"currency\":{{currency}}}},{\"operation_identifier\":{\"index\":1},\"type\":\"transfer\",\"account\":{\"address\":{{recipient.account.address}}},\"amount\":{\"value\":{{recipient_amount}},\"currency\":{{currency}}}}]",
        "type": "set_variable",
        "output_path": "transfer.operations"
       }
      ]
     }
    ]
   }
  ],
  "end_conditions": {
   "create_account": 10,
   "transfer": 10
  }
 },

 "data": {
  "historical_balance_disabled": false,
  "reconciliation_disabled": false,
  "inactive_discrepency_search_disabled": false,
  "balance_tracking_disabled": false,
  "end_conditions": {
    "tip": true
  },
  "active_reconciliation_concurrency": 1,
  "inactive_reconciliation_concurrency": 1
 }
}
EOF

cat EunoPay.conf

# Wait 5 seconds...
sleep 8

# Run Rosetta CLI
echo "Checking Data API..."
./bin/rosetta-cli check:data --configuration-file EunoPay.conf

echo "Checking Construction API..."
./bin/rosetta-cli check:construction --configuration-file EunoPay.conf
