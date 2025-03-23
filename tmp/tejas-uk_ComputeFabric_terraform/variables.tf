variable "location" {
  description = "The Azure region to deploy resources in."
  type        = string
  default     = "eastus"
}

variable "environment" {
  description = "The environment for deployment (e.g., dev, prod)."
  type        = string
  default     = "production"
}

variable "sql_admin_user" {
  description = "The administrator username for the SQL server."
  type        = string
  default     = "sqladmin"
}

variable "sql_admin_password" {
  description = "The administrator password for the SQL server."
  type        = string
  default     = "ChangeMe123!"
}
