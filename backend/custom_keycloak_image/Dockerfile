# Use a more feature-rich base image
FROM ubuntu:22.04

# Install necessary tools
RUN apt-get update && apt-get install -y curl jq openjdk-17-jdk unzip

# Install Keycloak
RUN curl -L https://github.com/keycloak/keycloak/releases/download/25.0.2/keycloak-25.0.2.zip -o /opt/keycloak.zip \
    && unzip /opt/keycloak.zip -d /opt/ \
    && mv /opt/keycloak-25.0.2 /opt/keycloak \
    && rm /opt/keycloak.zip

# Set environment variables
ENV KEYCLOAK_HOME=/opt/keycloak

# Copy your custom initialization script
COPY init_keycloak.sh /opt/keycloak/

# Make the script executable
RUN chmod +x /opt/keycloak/init_keycloak.sh

# Expose the necessary port
EXPOSE 8080

# Set the entrypoint
ENTRYPOINT ["/bin/sh", "-c", "/opt/keycloak/init_keycloak.sh & /opt/keycloak/bin/kc.sh start-dev"]