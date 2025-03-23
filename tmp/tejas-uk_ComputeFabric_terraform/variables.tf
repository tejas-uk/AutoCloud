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

variable "tags" {
  description = "A map of tags to assign to the resources."
  type        = map(string)
  default     = {
    environment = "production"
    project     = "ComputeFabric"
  }
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

variable "database_name" {
  description = "The name of the Azure SQL Database."
  type        = string
}

variable "sql_administrator_login" {
  description = "The administrator login for SQL Server."
  type        = string
}

variable "sql_administrator_password" {
  description = "The administrator password for SQL Server."
  type        = string
  sensitive   = true
}

variable "storage_account_name" {
  description = "The name of the Azure Storage Account."
  type        = string
}

variable "api_management_name" {
  description = "The name of the Azure API Management instance."
  type        = string
}