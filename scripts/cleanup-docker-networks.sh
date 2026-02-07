#!/bin/bash
# Docker Network Cleanup Script
# Removes old networks before docker-compose up to ensure fresh network creation

set -e

APP_NAME="${1:-stock-pos}"
OLD_NETWORK="${APP_NAME}_stock-pos-network"
OLD_DEFAULT_NETWORK="${APP_NAME}_default"

echo "=============================================="
echo "Docker Network Cleanup Script"
echo "=============================================="
echo "Application: $APP_NAME"
echo ""

# Remove old networks if they exist
echo "[1] Checking for old networks to remove..."

if docker network ls --format "{{.Name}}" | grep -q "^${OLD_NETWORK}$"; then
    echo "Found old network: $OLD_NETWORK"
    echo "Removing containers connected to this network..."
    
    # Get all containers on this network
    containers=$(docker network inspect "$OLD_NETWORK" -f '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || true)
    
    if [ -n "$containers" ]; then
        echo "Containers on $OLD_NETWORK: $containers"
        echo "These will be removed by docker-compose down..."
    fi
    
    echo "Removing network: $OLD_NETWORK"
    docker network rm "$OLD_NETWORK" 2>/dev/null || true
    echo "✓ Old network removed"
else
    echo "✓ Old network not found (or already removed)"
fi

# Remove default network if it exists and is empty
if docker network ls --format "{{.Name}}" | grep -q "^${OLD_DEFAULT_NETWORK}$"; then
    echo "Found default network: $OLD_DEFAULT_NETWORK"
    
    # Count containers on this network
    container_count=$(docker network inspect "$OLD_DEFAULT_NETWORK" -f '{{len .Containers}}' 2>/dev/null || echo "0")
    
    if [ "$container_count" = "0" ]; then
        echo "Removing empty default network: $OLD_DEFAULT_NETWORK"
        docker network rm "$OLD_DEFAULT_NETWORK" 2>/dev/null || true
        echo "✓ Default network removed"
    else
        echo "⚠ Default network has $container_count containers, keeping it"
    fi
else
    echo "✓ Default network not found"
fi

echo ""
echo "[2] Current Docker networks:"
docker network ls --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}"

echo ""
echo "=============================================="
echo "Cleanup Complete!"
echo "=============================================="
