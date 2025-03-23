resource "azurerm_resource_group" "main" {
  name     = "compute-fabric-rg-${random_string.suffix.result}"
  location = var.location
  tags = {
    environment = var.environment
    project     = "ComputeFabric"
  }
}

resource "azurerm_app_service_plan" "main" {
  name                = "app-service-plan-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku {
    tier = "Standard"
    size = "S1"
  }
  tags = {
    environment = var.environment
    project     = "ComputeFabric"
  }
}

resource "azurerm_app_service" "main" {
  name                = "app-service-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  app_service_plan_id = azurerm_app_service_plan.main.id
  tags = {
    environment = var.environment
    project     = "ComputeFabric"
  }
}

resource "azurerm_sql_server" "main" {
  name                         = "sql-server-${random_string.suffix.result}"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_user
  administrator_login_password = var.sql_admin_password
  tags = {
    environment = var.environment
    project     = "ComputeFabric"
  }
}

resource "azurerm_sql_database" "main" {
  name                = "sql-database-${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  server_name         = azurerm_sql_server.main.name
  sku_name            = "S0"
  tags = {
    environment = var.environment
    project     = "ComputeFabric"
  }
}

resource "azurerm_storage_account" "main" {
  name                     = "storageacc${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  tags = {
    environment = var.environment
    project     = "ComputeFabric"
  }
}

resource "azurerm_api_management" "main" {
  name                = "api-management-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  publisher_name      = "My Company"
  publisher_email     = "admin@mycompany.com"
  sku_name            = "Developer_1"
  tags = {
    environment = var.environment
    project     = "ComputeFabric"
  }
}

resource "azuread_application" "main" {
  display_name = "ComputeFabricApp-${random_string.suffix.result}"
}

resource "azuread_service_principal" "main" {
  application_id = azuread_application.main.application_id
}
