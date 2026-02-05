terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45.0"
    }
  }
}

# Firewall
resource "hcloud_firewall" "firewall" {
  name = var.firewall_name

  # SSH rule
  dynamic "rule" {
    for_each = var.allow_ssh ? [1] : []
    content {
      direction  = "in"
      protocol   = "tcp"
      port       = "22"
      source_ips = var.ssh_source_ips
    }
  }

  # HTTP rule
  dynamic "rule" {
    for_each = var.allow_http ? [1] : []
    content {
      direction  = "in"
      protocol   = "tcp"
      port       = "80"
      source_ips = ["0.0.0.0/0", "::/0"]
    }
  }

  # HTTPS rule
  dynamic "rule" {
    for_each = var.allow_https ? [1] : []
    content {
      direction  = "in"
      protocol   = "tcp"
      port       = "443"
      source_ips = ["0.0.0.0/0", "::/0"]
    }
  }

  dynamic "rule" {
    for_each = var.allow_http ? [1] : []  # Placeholder for future rules
    content {
      direction  = "in"
      protocol   = "tcp"
      port       = "8080"
      source_ips = ["0.0.0.0/0", "::/0"]
    }
  }

  dynamic "rule" {
    for_each = var.allow_http ? [1] : []  # Placeholder for future rules
    content {
      direction  = "in"
      protocol   = "tcp"
      port       = "50000"
      source_ips = ["0.0.0.0/0", "::/0"]
    }
  }

  dynamic "rule" {
    for_each = var.allow_http ? [1] : []  # Placeholder for future rules
    content {
      direction  = "in"
      protocol   = "tcp"
      port       = "3000"
      source_ips = ["0.0.0.0/0", "::/0"]
    
    }
  }

  labels = var.labels
}