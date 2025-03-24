
output "app_service_url" {
  description = "URL of the deployed App Service"
  value       = azurerm_app_service.main.default_site_hostname
}

output "sql_server_name" {
  description = "Name of the SQL Server"
  value       = azurerm_mssql_server.main.name
}

output "storage_account_name" {
  description = "Name of the Storage Account"
  value       = azurerm_storage_account.main.name
}

output "api_management_name" {
  description = "Name of the API Management instance"
  value       = azurerm_api_management.main.name
}
