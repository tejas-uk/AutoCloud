resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.common_tags
}

module "app_service" {
  source              = "Azure/app-service/azurerm"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  app_service_name    = var.app_service_name
}

module "sql_database" {
  source                   = "Azure/sql-database/azurerm"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  sql_server_name          = var.sql_server_name
  sql_database_name        = var.sql_database_name
  sql_administrator_login  = var.sql_administrator_login
  sql_administrator_pw     = var.sql_administrator_pw
}

resource "azurerm_storage_account" "main" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  tags                     = var.common_tags
}

module "api_management" {
  source              = "Azure/api-management/azurerm"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  api_management_name = var.api_management_name
}

resource "azurerm_role_assignment" "ad_assignment" {
  principal_id   = var.ad_principal_id
  role_definition_name = "Contributor"
  scope          = azurerm_resource_group.main.id
}