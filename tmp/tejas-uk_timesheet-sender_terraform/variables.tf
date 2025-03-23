
# Terraform variables definition file

variable "location" {
  description = "Azure region to deploy resources"
  type        = string
  default     = "East US"
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "storage_account_name" {
  description = "Name of the storage account"
  type        = string
}

variable "function_name" {
  description = "Name of the Azure Function"
  type        = string
}

variable "app_service_plan_name" {
  description = "Name of the app service plan for Azure Function"
  type        = string
}

variable "logic_app_name" {
  description = "Name of the Logic App"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}
