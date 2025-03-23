output "app_service_url" {
  description = "The URL of the Azure App Service."
  value       = azurerm_app_service.app.default_site_hostname
}

output "sql_server_fqdn" {
  description = "The FQDN of the Azure SQL Server."
  value       = azurerm_sql_server.sql_server.fully_qualified_domain_name
}

output "storage_account_endpoint" {
  description = "The primary endpoint for the Azure Blob Storage account."
  value       = azurerm_storage_account.storage.primary_blob_endpoint
}

output "api_management_url" {
  description = "The URL of the Azure API Management service."
  value       = azurerm_api_management.api_management.gateway_url
}

output "active_directory_app_id" {
  description = "The Application ID of the Azure AD application."
  value       = azuread_application.app.application_id
}
