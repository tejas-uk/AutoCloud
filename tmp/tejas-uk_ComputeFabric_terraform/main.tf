module "azure_app_service" {
  source              = "./modules/app_service"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.location
  app_service_name    = var.app_service_name
  app_service_plan_id = azurerm_app_service_plan.app_service_plan.id
}

module "azure_sql_database" {
  source                   = "./modules/sql_database"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = var.location
  sql_server_name          = var.sql_server_name
  sql_database_name        = var.sql_database_name
  sql_administrator_login  = var.sql_administrator_login
  sql_administrator_password = var.sql_administrator_password
}

module "azure_blob_storage" {
  source              = "./modules/blob_storage"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.location
  storage_account_name = var.storage_account_name
}

module "azure_api_management" {
  source              = "./modules/api_management"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.location
  api_management_name = var.api_management_name
}

module "azure_active_directory" {
  source                  = "./modules/active_directory"
  tenant_id               = var.tenant_id
  application_name        = var.application_name
}

resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

resource "azurerm_app_service_plan" "app_service_plan" {
  name                = var.app_service_plan_name
  location            = var.location
  resource_group_name = azurerm_resource_group.rg.name
  sku {
    tier = "Basic"
    size = "B1"
  }
}
