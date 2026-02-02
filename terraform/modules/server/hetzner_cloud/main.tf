terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45.0"
    }
  }
}

resource "hcloud_server" "server" {
  name        = var.server_name
  server_type = var.server_type
  image       = var.image
  location    = var.location
  
  ssh_keys = var.ssh_key_ids

  labels = merge(
    var.labels,
    {
      managed_by = "terraform"
    }
  )

  public_net {
    ipv4_enabled = var.enable_ipv4
    # ipv6_enabled = var.enable_ipv6
  }

  user_data = var.user_data

  lifecycle {
    ignore_changes = [
      ssh_keys,
      user_data
    ]
    # Prevents recreation on label changes
    # prevent_destroy = false

    # create_before_destroy = true
    # replace_triggered_by = [
    #   var.server_type,
    #   var.image,
    # ]
    # 
  }
}