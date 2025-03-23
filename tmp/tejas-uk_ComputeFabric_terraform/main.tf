module "app_service" {
  source = "./modules/app_service"
}

module "sql_database" {
  source = "./modules/sql_database"
}

module "blob_storage" {
  source = "./modules/blob_storage"
}

module "api_management" {
  source = "./modules/api_management"
}

module "active_directory" {
  source = "./modules/active_directory"
}

resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}
