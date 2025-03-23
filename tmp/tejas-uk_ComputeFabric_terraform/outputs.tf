output "app_service_url" {
  description = "The URL of the deployed App Service"
  value       = azurerm_app_service.app.default_site_hostname
}

output "sql_server_fqdn" {
  description = "The FQDN of the SQL Server"
  value       = azurerm_sql_server.main.fully_qualified_domain_name
}

output "storage_account_primary_endpoint" {
  description = "The primary endpoint for the Storage Account"
  value       = azurerm_storage_account.main.primary_blob_endpoint
}
