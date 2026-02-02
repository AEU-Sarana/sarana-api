# modules/compute/outputs.tf

output "server_id" {
  description = "ID of the server"
  value       = hcloud_server.server.id
}

output "server_name" {
  description = "Name of the server"
  value       = hcloud_server.server.name
}

output "ipv4_address" {
  description = "Public IPv4 address"
  value       = hcloud_server.server.ipv4_address
}

output "ipv6_address" {
  description = "Public IPv6 address"
  value       = hcloud_server.server.ipv6_address
}

output "ipv6_network" {
  description = "IPv6 network"
  value       = hcloud_server.server.ipv6_network
}

output "status" {
  description = "Server status"
  value       = hcloud_server.server.status
}