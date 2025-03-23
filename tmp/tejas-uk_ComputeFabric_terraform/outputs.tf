# Outputs from the deployment

output "resource_group_name" {
  description = "The name of the resource group."
  value       = azurerm_resource_group.main.name
}

output "sql_server_id" {
  description = "The ID of the SQL server."
  value       = module.azure_sql_database.sql_server_id
}

output "app_service_url" {
  description = "The default URL of the App Service."
  value       = module.azure_app_service.default_site_hostname
}

output "storage_account_id" {
  description = "The ID of the Storage Account."
  value       = module.azure_blob_storage.storage_account_id
}

output "b2c_tenant_id" {
  description = "The ID of the Azure AD B2C tenant."
  value       = module.azure_ad_b2c.b2c_tenant_id
}

output "logic_app_id" {
  description = "The ID of the Logic App."
  value       = module.azure_logic_app.logic_app_id
}
