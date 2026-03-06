# environments/staging/variables.tf

variable "hetzner_token" {
  description = "Hetzner Cloud API Token"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "location" {
  description = "Hetzner datacenter location"
  type        = string
}

variable "server_image" {
  description = "Server OS image"
  type        = string
}

variable "ssh_key_ids" {
  description = "List of SSH key IDs"
  type        = list(string)
}

variable "allowed_ssh_ips" {
  description = "IP addresses allowed to SSH"
  type        = list(string)
}

# Firewall configuration
variable "ssh_source_ips" {
  description = "Source IPs allowed for SSH"
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
}

# Backend server configuration
variable "backend_server_type" {
  description = "Server type for backend"
  type        = string
}

# variable "jenkins_server_type" {
#   description = "Server type for Jenkins"
#   type        = string
# }

variable "create_backend_volume" {
  description = "Create storage volume for backend"
  type        = bool
}

variable "backend_volume_size" {
  description = "Backend volume size in GB"
  type        = number
}


# Database server configuration
variable "create_database_server" {
  description = "Create a separate database server"
  type        = bool
  default     = false
}

variable "database_server_type" {
  description = "Server type for database"
  type        = string
  default     = "cx22"
}

variable "database_volume_size" {
  description = "Database volume size in GB"
  type        = number
  default     = 20
}

# Network configuration
variable "enable_private_network" {
  description = "Enable private networking"
  type        = bool
  default     = false
}

variable "custom_firewall_rules" {
  description = "Custom firewall rules"
  type = list(object({
    direction  = string
    protocol   = string
    port       = string
    source_ips = list(string)
  }))
  default = [
    {
      direction  = "in"
      protocol   = "tcp"
      port       = "8088"
      source_ips = ["0.0.0.0/0", "::/0"]
    },
    {
      direction  = "in"
      protocol   = "tcp"
      port       = "9100"
      source_ips = ["0.0.0.0/0", "::/0"]
    }
  ]
}



variable "cloudflare_api_token" {
  description = "Cloudflare API Token"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID"
  type        = string
}

variable "domain" {
  description = "Your domain name"
  type        = string
  default     = "example.com"
}

variable "subdomain" {
  description = "Subdomain for the server"
  type        = string
  default     = "app"
}

variable "proxied" {
  description = "Whether to proxy through Cloudflare (orange cloud)"
  type        = bool
  default     = false
}
