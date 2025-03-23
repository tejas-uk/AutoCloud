// Main Terraform configuration file for deploying Azure resources for the ComputeFabric application

module "azure_app_service" {
  source = "./modules/app_service"
  name   = var.app_service_name
  location = var.location
  resource_group_name = azurerm_resource_group.compute_fabric_rg.name
  app_service_plan_id = azurerm_app_service_plan.compute_fabric_plan.id
}

module "azure_sql_database" {
  source = "./modules/sql_database"
  name   = var.sql_database_name
  location = var.location
  resource_group_name = azurerm_resource_group.compute_fabric_rg.name
  server_name = azurerm_sql_server.compute_fabric_server.name
}

module "azure_blob_storage" {
  source = "./modules/blob_storage"
  name   = var.blob_storage_name
  location = var.location
  resource_group_name = azurerm_resource_group.compute_fabric_rg.name
}

module "azure_api_management" {
  source = "./modules/api_management"
  name   = var.api_management_name
  location = var.location
  resource_group_name = azurerm_resource_group.compute_fabric_rg.name
}

module "azure_active_directory" {
  source = "./modules/active_directory"
  name   = var.active_directory_name
}

resource "azurerm_resource_group" "compute_fabric_rg" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

resource "azurerm_app_service_plan" "compute_fabric_plan" {
  name                = var.app_service_plan_name
  location            = var.location
  resource_group_name = azurerm_resource_group.compute_fabric_rg.name
  sku {
    tier = "Standard"
    size = "S1"
  }
  tags = var.tags
}

resource "azurerm_sql_server" "compute_fabric_server" {
  name                         = var.sql_server_name
  resource_group_name          = azurerm_resource_group.compute_fabric_rg.name
  location                     = var.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_username
  administrator_login_password = var.sql_admin_password
  tags                         = var.tags
}