provider "azurerm" {
  features {}
}

module "app_service" {
  source              = "Azure/app-service/azurerm"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  app_service_name    = var.app_service_name
  app_service_plan_id = azurerm_app_service_plan.main.id
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
  sku {
    tier = "Standard"
    size = "S1"
  }
}

resource "azurerm_sql_server" "main" {
  name                         = var.sql_server_name
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_username
  administrator_login_password = var.sql_admin_password
}

resource "azurerm_sql_database" "main" {
  name                = var.sql_database_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  server_name         = azurerm_sql_server.main.name
  sku_name            = "S0"
}

resource "azurerm_storage_account" "main" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_logic_app_workflow" "main" {
  name                = var.logic_app_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_monitor_diagnostic_setting" "main" {
  name               = "example-diagnostic-setting"
  target_resource_id = azurerm_app_service_plan.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  log {
    category = "AppServiceHTTPLogs"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 30
    }
  }
}

resource "azurerm_log_analytics_workspace" "main" {
  name                = var.log_analytics_workspace_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
}
