# Terraform variables definition file

variable "location" {
  description = "The Azure region where resources will be created."
  type        = string
  default     = "East US"
}

variable "resource_group_name" {
  description = "The name of the resource group in which resources will be created."
  type        = string
}

variable "sql_server_name" {
  description = "The name of the SQL server."
  type        = string
}

variable "sql_admin_username" {
  description = "The administrator username for the SQL server."
  type        = string
}

variable "sql_admin_password" {
  description = "The administrator password for the SQL server."
  type        = string
  sensitive   = true
}

variable "app_service_plan_name" {
  description = "The name of the App Service Plan."
  type        = string
}

variable "app_service_name" {
  description = "The name of the App Service."
  type        = string
}

variable "app_service_sku" {
  description = "The SKU of the App Service plan."
  type        = string
}

variable "storage_account_name" {
  description = "The name of the Storage Account."
  type        = string
}

variable "b2c_tenant_name" {
  description = "The name of the Azure AD B2C tenant."
  type        = string
}

variable "logic_app_name" {
  description = "The name of the Logic App."
  type        = string
}

variable "environment" {
  description = "The environment for the deployment (e.g., dev, prod)."
  type        = string
}
