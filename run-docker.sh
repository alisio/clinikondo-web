#!/bin/bash

# CliniKondo Web - Docker Build & Run Script
# Build da imagem com variáveis de ambiente e executa o container

# Verifica se o arquivo .env.docker existe
if [ ! -f ".env.docker" ]; then
    echo "❌ Arquivo .env.docker não encontrado!"
    echo "📋 Copie .env.docker.example para .env.docker e configure suas credenciais:"
    echo "   cp .env.docker.example .env.docker"
    echo "   # Edite .env.docker com suas próprias chaves API"
    exit 1
fi

# Carrega as variáveis do arquivo .env.docker
set -a
source .env.docker
set +a

# Build da imagem com build args das variáveis carregadas
docker build \
  --build-arg VITE_FIREBASE_API_KEY="$VITE_FIREBASE_API_KEY" \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN="$VITE_FIREBASE_AUTH_DOMAIN" \
  --build-arg VITE_FIREBASE_PROJECT_ID="$VITE_FIREBASE_PROJECT_ID" \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET="$VITE_FIREBASE_STORAGE_BUCKET" \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="$VITE_FIREBASE_MESSAGING_SENDER_ID" \
  --build-arg VITE_FIREBASE_APP_ID="$VITE_FIREBASE_APP_ID" \
  --build-arg VITE_LLM_API_KEY="$VITE_LLM_API_KEY" \
  --build-arg VITE_AI_API_URL="$VITE_AI_API_URL" \
  --build-arg VITE_AI_VISION_MODEL="$VITE_AI_VISION_MODEL" \
  --build-arg VITE_AI_CLASSIFY_MODEL="$VITE_AI_CLASSIFY_MODEL" \
  --build-arg VITE_USE_EMULATORS="$VITE_USE_EMULATORS" \
  -t clinikondo-web .

# Executa o container
docker run -p 8080:80 clinikondo-web