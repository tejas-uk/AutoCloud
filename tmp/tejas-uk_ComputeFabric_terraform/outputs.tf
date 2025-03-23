output "app_service_url" {
  description = "URL of the deployed App Service"
  value       = module.app_service.url
}

output "sql_server_fqdn" {
  description = "Fully qualified domain name of the SQL Server"
  value       = module.sql_database.sql_server_fqdn
}

output "storage_account_name" {
  description = "Name of the Storage Account"
  value       = module.blob_storage.storage_account_name
}
