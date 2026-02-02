# modules/network/hetzner-firewall/outputs.tf

output "firewall_id" {
  description = "ID of the firewall"
  value       = hcloud_firewall.firewall.id
}

output "firewall_name" {
  description = "Name of the firewall"
  value       = hcloud_firewall.firewall.name
}