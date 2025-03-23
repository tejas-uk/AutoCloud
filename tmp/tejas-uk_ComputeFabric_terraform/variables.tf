// Terraform variables definition

variable "location" {
  description = "The Azure region where resources will be deployed."
  type        = string
  default     = "East US"
}

variable "resource_group_name" {
  description = "The name of the resource group."
  type        = string
}

variable "app_service_name" {
  description = "The name of the Azure App Service."
  type        = string
}

variable "app_service_plan_name" {
  description = "The name of the App Service plan."
  type        = string
}

variable "sql_database_name" {
  description = "The name of the Azure SQL Database."
  type        = string
}

variable "sql_server_name" {
  description = "The name of the Azure SQL Server."
  type        = string
}

variable "sql_admin_username" {
  description = "The administrator username for SQL Server."
  type        = string
}

variable "sql_admin_password" {
  description = "The administrator password for SQL Server."
  type        = string
  sensitive   = true
}

variable "blob_storage_name" {
  description = "The name of the Azure Blob Storage account."
  type        = string
}

variable "api_management_name" {
  description = "The name of the Azure API Management service."
  type        = string
}

variable "active_directory_name" {
  description = "The name of the Azure Active Directory."
  type        = string
}

variable "tags" {
  description = "A map of tags to assign to the resources."
  type        = map(string)
  default     = {
    environment = "Production"
    project     = "ComputeFabric"
  }
}