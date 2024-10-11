#!/bin/bash
set -e

echo "Starting Rolling Release Deployment for OAS API Service"

# Function to check if pull was successful
git_pull_with_retry() {
    echo "Attempting git pull..."
    if git pull; then
        echo "Git pull was successful"
    else
        echo "Git pull failed, attempting force pull..."
        git fetch --all
        git reset --hard origin/$(git rev-parse --abbrev-ref HEAD)
        if git pull; then
            echo "Force pull was successful"
        else
            echo "Force pull failed. Exiting."
            exit 1
        fi
    fi
}

# Update repository
git_pull_with_retry

# Check and copy config file if needed
if [ -f config.env ]; then
    echo "config.env file exists."
else
    echo "Copying config.env from $SECRET_PATH"
    cp "$SECRET_PATH/config.env" .
    echo "config.env file copied successfully"
fi

# Generate a unique tag for the new build
NEW_TAG="build-$(date +%Y%m%d%H%M%S)"
echo "Generated new tag: $NEW_TAG"

# Build the new image
echo "Building new Docker image with tag: $NEW_TAG"
docker compose build --no-cache

# Tag the new build
docker tag oas-api:latest "oas-api:$NEW_TAG"
echo "Tagged new build as oas-api:$NEW_TAG"

# Start the new container
echo "Starting new container with tag: $NEW_TAG"
docker compose up -d --no-deps --scale app=2 --no-recreate -d

# Wait for the new container to be healthy
echo "Waiting for new container to be healthy..."
until [ "`docker inspect -f {{.State.Health.Status}} $(docker compose ps -q app | tail -n1)`" == "healthy" ]; do
    sleep 5
    echo "Still waiting for container to be healthy..."
done

# Stop the old container
echo "New container is healthy. Stopping old container..."
docker stop $(docker compose ps -q app | head -n1)

# Remove the old container
echo "Removing old container..."
docker rm $(docker compose ps -q app | head -n1)

# Prune unused images and volumes
echo "Pruning unused Docker resources..."
docker system prune -af --volumes

echo "Rolling release deployment completed successfully!"