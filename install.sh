# !/bin/sh

set -e
DEBIAN_FRONTEND=noninteractive

# Install docker if not installed
if ! [ -x "$(command -v docker)" ]; then
    echo 'Error: docker is not installed.' >&2
    echo 'Installing docker...'
    curl -fsSL https://get.docker.com | sh -
    echo 'Docker installed successfully.'
else
    echo 'Docker is already installed.'
fi

# If ~/agent.key file does not exist, create it
if [ ! -f ~/agent.key ]; then
    echo "Generating agent key..."
    RANDOM_STRING=$(head -c 256 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9')
    echo $RANDOM_STRING > ~/agent.key
    echo "Agent key generated successfully."
fi

# Read the agent key
AGENT_TOKEN=$(cat ~/agent.key)

# Pull the image
docker pull ghcr.io/sturtle-security/labagent:latest
# Generate the config
microk8s config > ~/kubeconfig
# Delete service if already exists
docker rm -f labagent || true
# Run the container
docker run -d --name labagent -e TOKEN=$AGENT_TOKEN -p 4567:3000 -v ~/kubeconfig:/app/kubeconfig.yaml ghcr.io/sturtle-security/labagent:latest