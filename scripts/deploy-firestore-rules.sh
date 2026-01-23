#!/bin/bash
# Firestore rules-ийг Firebase рүү deploy хийх.
# .env.local-ийн NEXT_PUBLIC_FIREBASE_PROJECT_ID-г ашиглана (байвал).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env.local"

PROJECT_ID=""
if [ -f "$ENV_FILE" ]; then
  PROJECT_ID=$(grep '^NEXT_PUBLIC_FIREBASE_PROJECT_ID=' "$ENV_FILE" 2>/dev/null | sed 's/^NEXT_PUBLIC_FIREBASE_PROJECT_ID=//' | tr -d '"' | tr -d "'" | xargs)
fi

cd "$PROJECT_DIR"

if [ -n "$PROJECT_ID" ]; then
  firebase deploy --only firestore:rules --project "$PROJECT_ID"
else
  firebase deploy --only firestore:rules
fi
