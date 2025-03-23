variable "location" {
  description = "The Azure region where resources will be deployed."
  default     = "East US"
}

variable "resource_group_name" {
  description = "The name of the resource group."
}

variable "app_service_name" {
  description = "The name of the App Service."
}

variable "sql_server_name" {
  description = "The name of the SQL Server."
}

variable "sql_database_name" {
  description = "The name of the SQL Database."
}

variable "sql_administrator_login" {
  description = "The administrator login for SQL Server."
}

variable "sql_administrator_pw" {
  description = "The administrator password for SQL Server."
  sensitive   = true
}

variable "storage_account_name" {
  description = "The name of the Storage Account."
}

variable "api_management_name" {
  description = "The name of the API Management service."
}

variable "ad_principal_id" {
  description = "The principal ID for Azure AD access."
}

variable "common_tags" {
  description = "A map of tags to assign to resources."
  type        = map(string)
  default     = {
    environment = "production"
    project     = "ComputeFabric"
  }
}