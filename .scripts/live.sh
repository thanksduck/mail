#!/bin/bash
set -e

echo "Starting To Live the 1 Alias Service Api"

git pull
## we will check if pull was successful
if [ $? -eq 0 ]; then
    echo "Pull was successful"
else
    echo "Pull was not successful"
    exit 1
fi

if [ -f config.env ]; then
    echo "File config.env exists."
else
    cp $SECRET_PATH/config.env .
    echo "config.env file copied from $SECRET_PATH/config.env"
    exit 1
fi

# we will first check if docker compose is up and running
if [ $(docker compose ps | grep -c "Up") -eq 0 ]; then
    echo "Docker compose is not running"
    docker compose up -d
else
    echo "Docker compose is running"
    docker compose down
    echo "Docker compose is down"
    docker compose up -d
fi

echo "deployment was successful"