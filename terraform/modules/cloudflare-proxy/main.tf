terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# Create DNS A record with Cloudflare proxy enabled
resource "cloudflare_record" "app" {
  zone_id = var.cloudflare_zone_id
  name    = var.subdomain != "" ? var.subdomain : "@"
  content = var.server_ip
  type    = "A"
  proxied = var.proxied  # Enable/disable Cloudflare proxy based on variable
  ttl     = var.proxied ? 1 : 3600  # Auto when proxied, otherwise 1 hour
}

# Cloudflare zone settings (SSL and Security combined)
# NOTE: Commented out due to read-only settings conflict with Cloudflare API
# Zone settings can be configured manually in Cloudflare dashboard instead:
# - SSL/TLS: Set to "Full (Strict)" 
# - Always Use HTTPS: On
# - Minimum TLS Version: 1.2
# - Security Level: Medium
# 
# Let's Encrypt (managed by Ansible) will handle the SSL certificate
# Uncomment if needed after resolving read-only settings issues
#resource "cloudflare_zone_settings_override" "zone_settings" {
#  zone_id = var.cloudflare_zone_id
#
#  settings {
#    # SSL/TLS Settings
#    ssl                      = "full"  # Use "full" once Let's Encrypt is configured
#    always_use_https         = "on"
#    automatic_https_rewrites = "on"
#    min_tls_version          = "1.2"
#    
#    # Security Settings
#    security_level           = "medium"
#    browser_check            = "on"
#    challenge_ttl            = 1800
#  }
#}
