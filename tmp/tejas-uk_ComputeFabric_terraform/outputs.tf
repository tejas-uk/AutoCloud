// Outputs from the deployment

output "app_service_url" {
  description = "The URL of the Azure App Service."
  value       = module.app_service.url
}

output "sql_database_id" {
  description = "The ID of the Azure SQL Database."
  value       = module.sql_database.id
}

output "storage_account_endpoint" {
  description = "The endpoint of the Azure Blob Storage."
  value       = module.blob_storage.endpoint
}

output "api_management_url" {
  description = "The URL of the Azure API Management instance."
  value       = module.api_management.url
}