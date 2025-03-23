
# Outputs file for retrieving essential deployment details

output "function_endpoint" {
  description = "Endpoint of the deployed Azure Function"
  value       = module.azure_function.endpoint
}

output "storage_account_name" {
  description = "The name of the storage account"
  value       = module.blob_storage.storage_account_name
}

output "logic_app_id" {
  description = "ID of the deployed Logic App"
  value       = azurerm_logic_app.main.id
}
