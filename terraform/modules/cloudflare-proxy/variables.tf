variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID"
  type        = string
}

variable "domain" {
  description = "Base domain name"
  type        = string
  default     = ""
}

variable "subdomain" {
  description = "Subdomain (leave empty for root domain)"
  type        = string
  default     = ""
}

variable "server_ip" {
  description = "Server IP address"
  type        = string
}

variable "proxied" {
  description = "Enable Cloudflare proxy (orange cloud)"
  type        = bool
  default     = true
}
