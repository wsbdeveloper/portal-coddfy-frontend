resource "azurerm_resource_group" "rg_fe" {
  name     = "rg-frontend-prod"
  location = "East US"
}

# Azure Static Web App para React
resource "azurerm_static_web_app" "react_app" {
  name                = "stapp-react-prod"
  resource_group_name = azurerm_resource_group.rg_fe.name
  location            = "East US 2" # SWA tem regiões específicas
  sku_tier            = "Free"
  sku_size            = "Free"
}