variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
  default     = "rg-compute-fabric"
}

variable "location" {
  description = "The Azure location for resources"
  type        = string
  default     = "East US"
}

variable "tags" {
  description = "Tags to be applied to all resources"
  type        = map(string)
  default     = {
    environment = "production"
    project     = "ComputeFabric"
  }
}
