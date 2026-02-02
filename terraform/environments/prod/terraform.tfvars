# # environments/staging/terraform.tfvars.example
# # Copy to terraform.tfvars and fill in your values

hetzner_token = "JKXj2eQbD6GsjNE3KC7Y3f2GkckPieeJFkRmENSFElv0csj2XlqKnRqBKjSK6jvG"
project_name  = "stock-pos-server"
location      = "hel1"
server_image  = "ubuntu-22.04"

# SSH configuration
ssh_key_ids = [
    "nanwork",  # Add your SSH key IDs from Hetzner
    "nanlabtop",
]

allowed_ssh_ips = [
  # "1.2.3.4/32"  # Your IP address
  "0.0.0.0/0",    # Or allow from anywhere (less secure)
  "::/0"
]

# # Backend server
 backend_server_type    = "cx23"  # 2 vCPU, 4GB RAM
create_backend_volume  = false
backend_volume_size    = 10


# jenkins_server_type = "cx23"

# # Database server (optional)
# # create_database_server = false
# # database_server_type   = "cx23"
# # database_volume_size   = 20

# # Networking
# enable_private_network = false

# # Custom firewall rules (optional)
# custom_firewall_rules = [
#   # Example: Allow PostgreSQL from specific IP
#   {
#     direction  = "in"
#     protocol   = "tcp"
#     port       = "5432"
#     source_ips = ["10.0.0.0/16"]
#   }
# ]

# # Cloudflare configuration 
cloudflare_api_token = "iwRJy4yd35vHdZYRF5qdoEdqxNB30bPCttUU8ibf"
domain = "techey.tech"
cloudflare_zone_id = "fce29fd4e24398ee579011b871307113"
subdomain = "backendhr"
proxied = true  # Enable Cloudflare Proxy (orange cloud)

