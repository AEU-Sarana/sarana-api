# modules/compute/variables.tf

variable "server_name" {
  description = "Name of the server"
  type        = string
}

variable "server_type" {
  description = "Server type (e.g., cx22, cx32)"
  type        = string
}

variable "image" {
  description = "OS image for the server"
  type        = string
  default     = "ubuntu-22.04"
}

variable "location" {
  description = "Datacenter location"
  type        = string
  default     = "nbg1"
}

variable "ssh_key_ids" {
  description = "List of SSH key IDs"
  type        = list(string)
  default     = []
}

variable "labels" {
  description = "Labels to apply to the server"
  type        = map(string)
  default     = {}
}

variable "enable_ipv4" {
  description = "Enable IPv4"
  type        = bool
  default     = true
}

variable "enable_ipv6" {
  description = "Enable IPv6"
  type        = bool
  default     = true
}

variable "user_data" {
  description = "Cloud-init user data"
  type        = string
  default     = null
}

variable "network_id" {
  description = "Private network ID to attach"
  type        = number
  default     = null
}

variable "private_ip" {
  description = "Private IP address in the network"
  type        = string
  default     = null
}