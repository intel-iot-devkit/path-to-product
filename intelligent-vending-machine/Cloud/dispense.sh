#!/bin/bash

# partion key - use MAC address
PARTITION_KEY=`cat /sys/class/net/[e]*/address | head -1`
if [ -z "$PARTITION_KEY" ]; then
	PARTITION_KEY=`cat /sys/class/net/[w]*/address | head -1`
fi

if [ -z "$PARTITION_KEY" ] ; then
	echo "Error: Unable to determine partition key"
	exit 1
fi

export PARTITION_KEY

# credentials
export AZURE_STORAGE_ACCOUNT='Insert your Azure account here'
export AZURE_STORAGE_ACCESS_KEY='Insert your Azure key here'
# proxy
export HTTP_PROXY='Add a proxy or comment line if not needed'
export HTTPS_PROXY='Add a proxy or comment line if not needed'

node dispense.js
