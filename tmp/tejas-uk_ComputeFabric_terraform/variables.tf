variable "location" {
  description = "The Azure region where resources will be deployed."
  type        = string
  default     = "East US"
}

variable "resource_group_name" {
  description = "The name of the resource group where resources will be deployed."
  type        = string
}

variable "tags" {
  description = "A map of tags to assign to the resources."
  type        = map(string)
  default     = {}
}

variable "app_service_name" {
  description = "The name of the Azure App Service."
  type        = string
}

variable "app_service_plan_name" {
  description = "The name of the App Service Plan."
  type        = string
}

variable "sql_server_name" {
  description = "The name of the Azure SQL Server."
  type        = string
}

variable "sql_database_name" {
  description = "The name of the Azure SQL Database."
  type        = string
}

variable "sql_administrator_login" {
  description = "The administrator login for the Azure SQL Server."
  type        = string
}

variable "sql_administrator_password" {
  description = "The administrator password for the Azure SQL Server."
  type        = string
  sensitive   = true
}

variable "storage_account_name" {
  description = "The name of the Azure Storage Account."
  type        = string
}

variable "api_management_name" {
  description = "The name of the Azure API Management service."
  type        = string
}

variable "tenant_id" {
  description = "The Azure AD tenant ID."
  type        = string
}

variable "application_name" {
  description = "The name of the Azure AD application."
  type        = string
}
