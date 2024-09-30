#!/bin/bash

# Define the file path
SECRET_FILE="/shared/rag_client_secret.txt"

# Check if the secret file already exists
if [ -f "$SECRET_FILE" ]; then
    echo "Secret file already exists. No action needed."
else
    # Wait for Keycloak to start
    until /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080/ --realm master --user $KEYCLOAK_ADMIN --password $KEYCLOAK_ADMIN_PASSWORD; do
        echo "Waiting for Keycloak to be available..."
        sleep 5
    done

    # Create a new client named 'rag'
    CLIENT_ID=$(/opt/keycloak/bin/kcadm.sh create clients -r master -s clientId=rag -s enabled=true -s clientAuthenticatorType=client-secret -s directAccessGrantsEnabled=true -s standardFlowEnabled=false -i)

    # Get the secret of the 'rag' client
    CLIENT_SECRET=$(/opt/keycloak/bin/kcadm.sh get clients/$CLIENT_ID/client-secret -r master | grep -oP '(?<="value" : ")[^"]+')

    # Save the secret to the file in the shared volume
    echo $CLIENT_SECRET > "$SECRET_FILE"

    echo "Client 'rag' created with secret: $CLIENT_SECRET"
    echo "Secret saved to $SECRET_FILE"
fi

# Keep the script running to prevent the container from stopping
tail -f /dev/null