#!/bin/bash

# CliniKondo Web - Docker Build & Run Script
# Build da imagem com variáveis de ambiente e executa o container

# Build da imagem com build args
docker build \
  --build-arg VITE_FIREBASE_API_KEY="AIzaSyAEHxaD1K7mv7-eO0LkNiSyquamGu8s1bE" \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN="clinikondo.firebaseapp.com" \
  --build-arg VITE_FIREBASE_PROJECT_ID="clinikondo" \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET="clinikondo.firebasestorage.app" \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="536820080658" \
  --build-arg VITE_FIREBASE_APP_ID="1:536820080658:web:1aaaa6fa372b4be27938cb" \
  --build-arg VITE_LLM_API_KEY="tuVqQBsXrNJBIIxL1mfKll26CRhkgAah" \
  --build-arg VITE_AI_API_URL="https://api.deepinfra.com/v1/openai" \
  --build-arg VITE_AI_VISION_MODEL="mistralai/Mistral-Small-3.2-24B-Instruct-2506" \
  --build-arg VITE_AI_CLASSIFY_MODEL="mistralai/Mistral-Small-3.2-24B-Instruct-2506" \
  --build-arg VITE_USE_EMULATORS="false" \
  -t clinikondo-web .

# Executa o container
docker run -p 8080:80 clinikondo-web