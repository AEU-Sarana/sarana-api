# modules/network/variables.tf

variable "create_network" {
  description = "Whether to create a private network"
  type        = bool
  default     = false
}

variable "network_name" {
  description = "Name of the network"
  type        = string
  default     = "private-network"
}

variable "network_ip_range" {
  description = "IP range for the network"
  type        = string
  default     = "10.0.0.0/16"
}

variable "network_zone" {
  description = "Network zone (eu-central, us-east, us-west)"
  type        = string
  default     = "eu-central"
}

variable "subnet_ip_range" {
  description = "IP range for the subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "firewall_name" {
  description = "Name of the firewall"
  type        = string
}

variable "allow_ssh" {
  description = "Allow SSH traffic"
  type        = bool
  default     = true
}

variable "ssh_source_ips" {
  description = "Source IPs allowed for SSH"
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
}

variable "allow_http" {
  description = "Allow HTTP traffic"
  type        = bool
  default     = true
}

variable "allow_https" {
  description = "Allow HTTPS traffic"
  type        = bool
  default     = true
}

variable "custom_rules" {
  description = "Custom firewall rules"
  type = list(object({
    direction  = string
    protocol   = string
    port       = string
    source_ips = list(string)
  }))
  default = []
}

variable "labels" {
  description = "Labels to apply"
  type        = map(string)
  default     = {}
}