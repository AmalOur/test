#!/bin/bash

# Wait until the Keycloak secret file is created in the shared volume
until [ -f /shared/rag_client_secret.txt ]; do
  echo "Waiting for Keycloak to generate the secret..."
  sleep 5
done

# Start the application
exec python app.py