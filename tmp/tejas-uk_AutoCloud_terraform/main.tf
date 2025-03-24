
resource "azurerm_resource_group" "main" {
  name     = "${var.prefix}-${random_string.suffix.result}-rg"
  location = var.location
  tags     = var.tags
}

resource "azurerm_app_service_plan" "main" {
  name                = "${var.prefix}-${random_string.suffix.result}-asp"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku {
    tier = "Standard"
    size = "S1"
  }
  tags = var.tags
}

resource "azurerm_app_service" "main" {
  name                = "${var.prefix}-${random_string.suffix.result}-app"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  app_service_plan_id = azurerm_app_service_plan.main.id
  tags                = var.tags
}

resource "azurerm_mssql_server" "main" {
  name                         = "${var.prefix}-${random_string.suffix.result}-sql"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_username
  administrator_login_password = var.sql_admin_password
  minimum_tls_version          = "1.2"
  public_network_access_enabled = false
  tags                         = var.tags
}

resource "azurerm_mssql_database" "main" {
  name           = "${var.prefix}-${random_string.suffix.result}-db"
  server_id      = azurerm_mssql_server.main.id
  collation      = "SQL_Latin1_General_CP1_CI_AS"
  license_type   = "LicenseIncluded"
  max_size_gb    = 2
  sku_name       = "Basic"
  tags           = var.tags
}

resource "azurerm_storage_account" "main" {
  name                     = "${var.prefix}${random_string.suffix.result}sa"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  tags                     = var.tags
}

resource "azurerm_api_management" "main" {
  name                = "${var.prefix}-${random_string.suffix.result}-apim"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  publisher_name      = var.publisher_name
  publisher_email     = var.publisher_email
  sku_name            = "Developer_1"
  tags                = var.tags
}

resource "azuread_application" "main" {
  display_name = "${var.prefix}-${random_string.suffix.result}-aad"
  tags         = toset([var.environment, var.project])
}
