# Main Terraform configuration for deploying Azure resources

module "app_service" {
  source              = "Azure/app-service/azurerm"
  resource_group_name = azurerm_resource_group.main.name
  app_service_name    = var.app_service_name
  location            = azurerm_resource_group.main.location
  tags                = var.tags
}

module "sql_database" {
  source                 = "Azure/sql/azurerm"
  resource_group_name    = azurerm_resource_group.main.name
  sql_server_name        = var.sql_server_name
  database_name          = var.sql_database_name
  admin_username         = var.sql_admin_username
  admin_password         = var.sql_admin_password
  location               = azurerm_resource_group.main.location
  tags                   = var.tags
}

module "blob_storage" {
  source                = "Azure/storage-account/azurerm"
  resource_group_name   = azurerm_resource_group.main.name
  storage_account_name  = var.storage_account_name
  location              = azurerm_resource_group.main.location
  tags                  = var.tags
}

module "api_management" {
  source               = "Azure/api-management/azurerm"
  resource_group_name  = azurerm_resource_group.main.name
  api_management_name  = var.api_management_name
  location             = azurerm_resource_group.main.location
  tags                 = var.tags
}

resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

resource "azuread_application" "main" {
  display_name = var.aad_app_name
}

resource "azuread_service_principal" "main" {
  application_id = azuread_application.main.application_id
}
