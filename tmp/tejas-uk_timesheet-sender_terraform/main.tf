
# Main Terraform configuration file for deploying Timesheet-Sender application

module "azure_function" {
  source              = "./modules/azure_function"
  function_name       = var.function_name
  resource_group_name = azurerm_resource_group.main.name
  storage_account_id  = azurerm_storage_account.main.id
  app_service_plan_id = azurerm_app_service_plan.main.id
}

module "blob_storage" {
  source              = "./modules/blob_storage"
  storage_account_name = var.storage_account_name
  resource_group_name  = azurerm_resource_group.main.name
}

resource "azurerm_logic_app" "main" {
  name                = var.logic_app_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    environment = var.environment
    project     = "Timesheet-Sender"
  }
}

resource "azurerm_app_service_plan" "main" {
  name                = var.app_service_plan_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  kind                = "FunctionApp"
  reserved            = true
  sku {
    tier = "Consumption"
    size = "Y1"
  }
}
