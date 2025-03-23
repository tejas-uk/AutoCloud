output "app_service_url" {
  description = "The URL of the Azure App Service."
  value       = module.app_service.app_service_url
}

output "sql_server_fqdn" {
  description = "The fully qualified domain name of the SQL Server."
  value       = module.sql_database.sql_server_fqdn
}

output "storage_account_endpoint" {
  description = "The endpoint of the Storage Account."
  value       = azurerm_storage_account.main.primary_blob_endpoint
}

output "api_management_gateway_url" {
  description = "The gateway URL of the API Management service."
  value       = module.api_management.api_management_gateway_url
}