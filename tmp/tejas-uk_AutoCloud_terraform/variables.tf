
variable "prefix" {
  description = "Prefix for all resources"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
}

variable "sql_admin_username" {
  description = "Administrator username for SQL Server"
  type        = string
}

variable "sql_admin_password" {
  description = "Administrator password for SQL Server"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment tag for Azure AD Application"
  type        = string
}

variable "project" {
  description = "Project tag for Azure AD Application"
  type        = string
}
