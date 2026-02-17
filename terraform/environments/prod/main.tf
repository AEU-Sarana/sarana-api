terraform {
  required_version = ">= 1.0"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}


locals {
  environment = "production"
  common_labels = {
    environment = local.environment
    managed_by  = "terraform"
    project     = var.project_name
  }
}


# Server 1
module "server" {
  source = "../../modules/server/hetzner_cloud/"

  server_name = "pos-server-01"
  server_type = "cx23"
  image       = "ubuntu-22.04"
  location    = "hel1"
  ssh_key_ids = var.ssh_key_ids

  # ssh_key_ids   = [hcloud_ssh_key.default.id]  # TODO: Define SSH key resource
  #   firewall_name = "firewall-server-01"


  enable_ipv4 = true
  #   allow_ssh       = true
  #   allow_http      = true
  #   allow_https     = true
  #   ssh_source_ips  = ["0.0.0.0/0", "::/0"]

  labels = {
    environment = "production"
    server_num  = "1"
  }

  #   user_data = file("${path.module}/cloud-init.yml") no need for now 
}

# Firewall Module
module "firewall" {
  source = "../../modules/firewall/"

  firewall_name  = "firewall-${local.environment}"
  allow_ssh      = true
  allow_http     = true
  allow_https    = true
  ssh_source_ips = var.ssh_source_ips
  custom_rules   = var.custom_firewall_rules

  labels = local.common_labels
}

# Firewall Attachment
resource "hcloud_firewall_attachment" "backend" {
  firewall_id = module.firewall.firewall_id
  server_ids  = [module.server.server_id]
}
# Cloudflare DNS and Proxy Configuration
module "cloudflare" {
  source = "../../modules/cloudflare-proxy/"

  cloudflare_zone_id = var.cloudflare_zone_id
  subdomain          = var.subdomain
  domain             = var.domain
  server_ip          = module.server.ipv4_address
  proxied            = var.proxied
}

# Output the server details
output "server_ip" {
  value       = module.server.ipv4_address
  description = "Public IP address of the server"
}

output "domain_name" {
  value       = var.subdomain != "" ? "${var.subdomain}.${var.domain}" : var.domain
  description = "Full domain name"
}

output "cloudflare_proxied" {
  value       = var.proxied
  description = "Whether Cloudflare proxy is enabled"
}
