// Main Terraform configuration file

module "app_service" {
  source              = "modules/app-service"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  app_service_name    = var.app_service_name
  app_service_plan_id = azurerm_app_service_plan.main.id
}

module "sql_database" {
  source                = "modules/sql-database"
  resource_group_name   = azurerm_resource_group.main.name
  location              = var.location
  sql_server_name       = var.sql_server_name
  database_name         = var.database_name
  sql_administrator_login = var.sql_administrator_login
  sql_administrator_password = var.sql_administrator_password
}

module "blob_storage" {
  source                 = "modules/blob-storage"
  resource_group_name    = azurerm_resource_group.main.name
  location               = var.location
  storage_account_name   = var.storage_account_name
}

module "api_management" {
  source                = "modules/api-management"
  resource_group_name   = azurerm_resource_group.main.name
  location              = var.location
  api_management_name   = var.api_management_name
}

resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

resource "azurerm_app_service_plan" "main" {
  name                = var.app_service_plan_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  kind                = "Windows"
  reserved            = false

  sku {
    tier = "Standard"
    size = "S1"
  }
}