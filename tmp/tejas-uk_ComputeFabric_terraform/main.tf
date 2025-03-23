# Main Terraform configuration file for deploying ComputeFabric application to Azure

module "azure_sql_database" {
  source              = "Azure/sql-database/azurerm"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  sql_server_name     = var.sql_server_name
  administrator_login = var.sql_admin_username
  administrator_login_password = var.sql_admin_password
  tags                = local.common_tags
}

module "azure_app_service" {
  source                   = "Azure/app-service/azurerm"
  location                 = var.location
  resource_group_name      = azurerm_resource_group.main.name
  app_service_plan_name    = var.app_service_plan_name
  app_service_name         = var.app_service_name
  app_service_sku          = var.app_service_sku
  tags                     = local.common_tags
}

module "azure_blob_storage" {
  source              = "Azure/storage-account/azurerm"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  storage_account_name = var.storage_account_name
  tags                = local.common_tags
}

module "azure_ad_b2c" {
  source              = "Azure/ad-b2c/azurerm"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  tenant_name         = var.b2c_tenant_name
  tags                = local.common_tags
}

module "azure_logic_app" {
  source              = "Azure/logic-app/azurerm"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  logic_app_name      = var.logic_app_name
  tags                = local.common_tags
}

resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
  tags     = local.common_tags
}

locals {
  common_tags = {
    environment = var.environment
    project     = "ComputeFabric"
  }
}
