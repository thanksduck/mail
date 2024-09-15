#!/bin/bash
set -e

echo "Starting To Live the 1 Alias Service Api"

git pull
## we will check if pull was successful
if [ $? -eq 0 ]; then
    echo "Pull was successful"
else
    echo "Pull was not successful, trying a force pull"
    git fetch --all
    git reset --hard origin/$(git rev-parse --abbrev-ref HEAD)
    git pull
    if [ $? -eq 0 ]; then
        echo "Force pull was successful"
    else
        echo "Force pull was not successful"
        exit 1
    fi
fi

if [ -f config.env ]; then
    echo "File config.env exists."
else
    cp $SECRET_PATH/config.env .
    echo "config.env file copied from $SECRET_PATH/config.env"
    exit 0
fi

# we will first check if docker compose is up and running
if [ $(docker compose ps | grep -c "Up") -eq 0 ]; then
    echo "Docker compose is not running"
    echo "Still we will destroy the docker compose"
    docker system prune -f
    docker compose up -d --build
else
    echo "Docker compose is running"
    docker compose down
    docker system prune -f
    echo "Docker compose was destroyed"
    docker compose up -d --build
fi

echo "deployment was successful"