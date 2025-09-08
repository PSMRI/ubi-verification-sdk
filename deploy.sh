#!/bin/bash
set -e

: "${BASE_DIR:?Need to set BASE_DIR}"
: "${REPO_NAME:?Need to set REPO_NAME}"
: "${REPO_URL:?Need to set REPO_URL}"
: "${BRANCH:?Need to set BRANCH}"
: "${TAG:=latest}"
: "${CONTAINER_NAME:?Need to set CONTAINER_NAME}"

cd "$BASE_DIR" || exit 1
# ----- Remove old code (except persistent data) -----
echo "Cleaning up existing code..."
rm -rf "$REPO_NAME"

# ----- Update code safely -----
echo "📥 Cloning repo..."
git clone -b "$BRANCH" "$REPO_URL" "$REPO_NAME"
cd "$REPO_NAME"

# ----- Show recent commits -----
git log -n 3 --oneline

# ----- Copy Dockerfile and .env -----
cp "$BASE_DIR/Dockerfile" .
cp "$BASE_DIR/.env" .

# ----- Build Docker image with tag -----
echo "🐳 Building Docker image $REPO_NAME:$TAG..."
docker build -t "$REPO_NAME:$TAG" .

# ----- Stop existing container -----
if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
  echo "🛑 Stopping existing container $CONTAINER_NAME..."
  docker rm -f "$CONTAINER_NAME"
fi

# ----- Run container -----
echo "🚀 Starting container $CONTAINER_NAME..."
docker run -d --name "$CONTAINER_NAME" -p 3010:3010 --env-file .env "$REPO_NAME:$TAG"

# ----- Show logs -----
sleep 10
echo "📄 Logs from $CONTAINER_NAME ($TAG):"
docker logs "$CONTAINER_NAME"
