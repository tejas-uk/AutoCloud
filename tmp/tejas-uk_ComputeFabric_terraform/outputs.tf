// Outputs from the deployment

output "app_service_url" {
  description = "The URL of the deployed Azure App Service."
  value       = azurerm_app_service.compute_fabric_app.default_site_hostname
}

output "sql_database_connection_string" {
  description = "The connection string for the Azure SQL Database."
  value       = azurerm_sql_server.compute_fabric_server.administrator_login
  sensitive   = true
}

output "blob_storage_endpoint" {
  description = "The endpoint URL for the Azure Blob Storage account."
  value       = azurerm_storage_account.compute_fabric_storage.primary_blob_endpoint
}

output "api_management_url" {
  description = "The URL for the Azure API Management service."
  value       = azurerm_api_management.compute_fabric_api.gateway_url
}
