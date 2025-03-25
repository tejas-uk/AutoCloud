
output "resource_group_name" {
  description = "The name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "app_service_url" {
  description = "The default URL of the App Service"
  value       = azurerm_app_service.main.default_site_hostname
}

output "sql_server_fqdn" {
  description = "The fully qualified domain name of the SQL Server"
  value       = azurerm_mssql_server.main.fully_qualified_domain_name
}

output "storage_account_name" {
  description = "The name of the storage account"
  value       = azurerm_storage_account.main.name
}

output "azure_ad_application_id" {
  description = "The ID of the Azure AD Application"
  value       = azuread_application.main.application_id
}

output "key_vault_name" {
  description = "The name of the Key Vault"
  value       = azurerm_key_vault.main.name
}
