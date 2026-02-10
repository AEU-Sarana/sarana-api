#!/bin/bash
# Load .env
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

BOT_TOKEN=$1
WEBHOOK_URL=$2

if [ -z "$BOT_TOKEN" ] || [ -z "$WEBHOOK_URL" ]; then
    echo "Usage: ./update-webhook.sh <BOT_TOKEN> <WEBHOOK_URL>"
    exit 1
fi

SECRET=$TELEGRAM_WEBHOOK_SECRET

if [ -z "$SECRET" ]; then
    echo "Error: TELEGRAM_WEBHOOK_SECRET not found in .env"
    exit 1
fi

echo "Setting webhook to: $WEBHOOK_URL"
echo "Using secret token: ${SECRET:0:5}****************"

curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
     -H "Content-Type: application/json" \
     -d "{\"url\": \"$WEBHOOK_URL\", \"secret_token\": \"$SECRET\"}"

echo -e "\nDone."
