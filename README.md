

* about deployment flow seup project 

    * about this project plan is one jenkins and many server
    * the first is : 
        run terraform for setup servers 
            - server jenkins (has already)
            - server for cliens 
        
        jenkins server need : 
            - set up jenkins on this server
            - generate ssh key if not have yet (public and private ssh key )
            - 
            

ANSIBLE : 
    for encrypt 
    ansible-vault encrypt ansible/inventories/production/group_vars/vault.yml


jan / 31 / 2026
    
    - run for create server clien
    - configre for jenkins server and clien server can ssh
    - set point DNS and SSL (HTTPS) not yet (i will add after conatiner is UP)
    - 

feb / 2 / 2026

    - prepare jenkins dashbaord credenatail 

    ***(when whe use scm in job pipeline not work make sure you have 
        - set ssh private key on jenkins dashbaord 
        - set ssh public key on github SSH and GPG key 
    )

    - create job pepiline
    - setup webhook 


    

## 🧾 Telegram Receipt Auto-Send Flow

This feature allows customers to receive receipts automatically on Telegram after a one-time linking process.

### Flow for Flutter App:
1. **Scan QR**: QR code contains only the `receipt_code`.
2. **Scan API**: Flutter calls `POST /api/v1/receipts/scan` with `{ receipt_code }`.
3. **Response**: 
   - If user is already linked: returns `{ linked: true, sent: true }`. Receipt is already in their Telegram.
   - If not linked: returns `{ linked: false, telegram_link: "..." }`. 
4. **Link User**: Flutter opens the `telegram_link`. User presses **[ START ]** in Telegram Bot.
5. **Success**: Bot links the user and sends the receipt immediately.

### API Endpoints:
- `POST /api/v1/receipts/scan`: Public endpoint for QR scanning.
- `POST /api/v1/receipts/verify`: Verify offline QR payload with HMAC (no order sync required).

## Offline Receipt QR (HMAC)

Endpoint: `POST /api/v1/receipts/verify`

Request (preferred):
```json
{
  "qr": "<base64url(payload)>.<hex_signature>"
}
```

Request (alternate):
```json
{
  "payload": {
    "receipt_code": "random-high-entropy",
    "receipt_number": "RCP-...",
    "order_date": "2026-02-10T10:00:00.000Z",
    "items": [
      { "product_name": "Item A", "qty": 2, "subtotal": 10.5 }
    ],
    "total_amount": 10.5
  },
  "signature": "<hex>"
}
```

Response:
```json
{
  "success": true,
  "verified": true,
  "receipt_number": "RCP-...",
  "total_amount": 10.5,
  "receipt_image_url": "https://.../receipts/receipt_...jpg"
}
```

HMAC:
- Algorithm: `HMAC-SHA256`
- Secret: `RECEIPT_QR_HMAC_SECRET` (must exist on POS and backend)
- Signature: hex digest over canonicalized JSON payload (sorted keys)
