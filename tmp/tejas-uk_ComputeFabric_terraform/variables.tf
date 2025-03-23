variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
}

variable "location" {
  description = "The location of the resources"
  type        = string
  default     = "East US"
}

variable "tags" {
  description = "A map of tags to assign to the resources"
  type        = map(string)
  default     = {
    environment = "production"
    owner       = "tejas-uk"
  }
}

variable "app_service_name" {
  description = "The name of the App Service"
  type        = string
}

variable "app_service_plan_name" {
  description = "The name of the App Service Plan"
  type        = string
}

variable "sql_server_name" {
  description = "The name of the SQL Server"
  type        = string
}

variable "sql_admin_username" {
  description = "The admin username for the SQL Server"
  type        = string
}

variable "sql_admin_password" {
  description = "The admin password for the SQL Server"
  type        = string
  sensitive   = true
}

variable "sql_database_name" {
  description = "The name of the SQL Database"
  type        = string
}

variable "storage_account_name" {
  description = "The name of the Storage Account"
  type        = string
}

variable "logic_app_name" {
  description = "The name of the Logic App"
  type        = string
}

variable "log_analytics_workspace_name" {
  description = "The name of the Log Analytics Workspace"
  type        = string
}
