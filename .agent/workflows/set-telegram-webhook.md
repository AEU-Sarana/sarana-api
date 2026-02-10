---
description: How to correctly set up the secure Telegram Webhook
---

# Secure Telegram Webhook Setup

This workflow ensures that your Telegram Bot Webhook is configured with the necessary security tokens to prevent unauthorized access.

## Prerequisites
1.  **Bot Token**: The API token provided by @BotFather.
2.  **Webhook URL**: Your public server URL (e.g., Cloudflare tunnel URL) ending in `/api/v1/telegram-admin-bot/webhook`.
3.  **Secret Token**: The value of `TELEGRAM_WEBHOOK_SECRET` from your `.env` file.

## Method 1: Using the provided Script (Recommended)
// turbo
1. Run the setup script from the root directory:
   ```bash
   ./update-telegram-webhook.sh <YOUR_BOT_TOKEN> <YOUR_WEBHOOK_URL>
   ```

## Method 2: Manual Setup (Postman / Curl)
If you prefer to use Postman or Curl manually, ensure you include the `secret_token` parameter.

### Postman Configuration:
*   **Method**: `POST`
*   **URL**: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook`
*   **Body Type**: `x-www-form-urlencoded` or `json`
*   **Parameters**:
    *   `url`: `<YOUR_WEBHOOK_URL>`
    *   `secret_token`: `<VALUE_FROM_ENV_TELEGRAM_WEBHOOK_SECRET>`

### Curl Command:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "<YOUR_WEBHOOK_URL>",
       "secret_token": "<YOUR_TELEGRAM_WEBHOOK_SECRET>"
     }'
```

## Verification
After setting the webhook, you can verify it by calling `getWebhookInfo`:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```
Ensure the `url` is correct and it says `has_custom_certificate` if applicable.

**Note**: If you see `403 Unauthorized` in your server logs after setting this up, make sure the `secret_token` you sent to Telegram matches exactly what is in your `.env` file.
