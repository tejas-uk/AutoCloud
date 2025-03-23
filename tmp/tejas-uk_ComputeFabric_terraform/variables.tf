# Variables definition

variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
}

variable "location" {
  description = "The Azure region to deploy resources"
  type        = string
  default     = "East US"
}

variable "app_service_name" {
  description = "The name of the App Service"
  type        = string
}

variable "sql_server_name" {
  description = "The name of the SQL Server"
  type        = string
}

variable "sql_database_name" {
  description = "The name of the SQL Database"
  type        = string
}

variable "sql_admin_username" {
  description = "The admin username for SQL Database"
  type        = string
}

variable "sql_admin_password" {
  description = "The admin password for SQL Database"
  type        = sensitive
}

variable "storage_account_name" {
  description = "The name of the Storage Account"
  type        = string
}

variable "api_management_name" {
  description = "The name of the API Management instance"
  type        = string
}

variable "aad_app_name" {
  description = "The name of the Azure AD application"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {
    environment = "production"
  }
}
