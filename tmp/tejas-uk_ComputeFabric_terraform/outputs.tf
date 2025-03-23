# Outputs for the deployed resources

output "app_service_url" {
  description = "The URL of the App Service"
  value       = module.app_service.default_site_hostname
}

output "sql_database_id" {
  description = "The ID of the SQL Database"
  value       = module.sql_database.database_id
}

output "storage_account_endpoint" {
  description = "The endpoint of the Blob Storage account"
  value       = module.blob_storage.primary_blob_endpoint
}

output "api_management_url" {
  description = "The URL of the API Management instance"
  value       = module.api_management.gateway_url
}

output "aad_app_id" {
  description = "The Application ID of the Azure AD app"
  value       = azuread_application.main.application_id
}
