
// Retrieve the current Azure client configuration

data "azurerm_client_config" "current" {}

// Resource Group
resource "azurerm_resource_group" "main" {
  name     = "${var.prefix}-${random_string.suffix.result}-rg"
  location = var.location
  tags     = var.tags
}

// App Service Plan
resource "azurerm_app_service_plan" "main" {
  name                = "${var.prefix}-${random_string.suffix.result}-asp"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku {
    tier = "Standard"
    size = "S1"
  }
}

// App Service
resource "azurerm_app_service" "main" {
  name                = "${var.prefix}-${random_string.suffix.result}-app"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  app_service_plan_id = azurerm_app_service_plan.main.id
}

// SQL Server
resource "azurerm_mssql_server" "main" {
  name                         = "${var.prefix}-${random_string.suffix.result}-sql"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_username
  administrator_login_password = var.sql_admin_password
  minimum_tls_version          = "1.2"
  public_network_access_enabled = false
}

// SQL Database
resource "azurerm_mssql_database" "main" {
  name                = "${var.prefix}-${random_string.suffix.result}-db"
  server_id           = azurerm_mssql_server.main.id
  sku_name            = "Basic"
  max_size_gb         = 2
}

// Storage Account
resource "azurerm_storage_account" "main" {
  name                     = "${var.prefix}${random_string.suffix.result}st"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

// Azure AD Application
resource "azuread_application" "main" {
  display_name = "${var.prefix}-${random_string.suffix.result}-app"
  tags         = toset([var.environment, var.project])
}

// API Management
resource "azurerm_api_management" "main" {
  name                = "${var.prefix}-${random_string.suffix.result}-api"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  publisher_name      = var.prefix
  publisher_email     = "${var.prefix}@example.com"
  sku_name            = "Developer_1"
}

// Application Insights
resource "azurerm_application_insights" "main" {
  name                = "${var.prefix}-${random_string.suffix.result}-ai"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  application_type    = "web"
}

// Key Vault
resource "azurerm_key_vault" "main" {
  name                = "${var.prefix}-${random_string.suffix.result}-kv"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    key_permissions = [
      "Get", "List", "Create", "Delete", "Update"
    ]

    secret_permissions = [
      "Get", "List", "Set", "Delete"
    ]
  }
}
