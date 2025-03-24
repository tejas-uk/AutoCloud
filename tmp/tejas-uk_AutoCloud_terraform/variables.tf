
variable "prefix" {
  description = "Prefix for resource names"
  type        = string
  default     = "autocloud"
}

variable "location" {
  description = "Azure region for resource deployment"
  type        = string
  default     = "eastus"
}

variable "sql_admin_username" {
  description = "Administrator username for SQL Server"
  type        = string
  default     = "sqladmin"
}

variable "sql_admin_password" {
  description = "Administrator password for SQL Server"
  type        = string
  default     = "P@ssw0rd1234"
  sensitive   = true
}

variable "publisher_name" {
  description = "Publisher name for API Management"
  type        = string
  default     = "AutoCloud Publisher"
}

variable "publisher_email" {
  description = "Publisher email for API Management"
  type        = string
  default     = "publisher@autocloud.com"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project" {
  description = "Project name for resource tagging"
  type        = string
  default     = "azure-app"
}

variable "tags" {
  description = "Tags for resources"
  type        = map(string)
  default     = {
    environment = "dev"
    project     = "azure-app"
  }
}
