output "domain_url" {
  description = "Full domain URL"
  value       = var.subdomain != "" ? "https://${var.subdomain}.${var.domain}" : "https://${var.domain}"
}

output "dns_record_id" {
  description = "Cloudflare DNS record ID"
  value       = cloudflare_record.app.id
}

output "proxied_status" {
  description = "Whether DNS record is proxied through Cloudflare"
  value       = cloudflare_record.app.proxied
}
