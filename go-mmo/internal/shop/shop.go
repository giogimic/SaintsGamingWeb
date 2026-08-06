package shop

// CatalogItem is a buyable shop row.
type CatalogItem struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Price int    `json:"price"`
}

// DefaultCatalog is the demo provisioner stock.
func DefaultCatalog() []CatalogItem {
	return []CatalogItem{
		{ID: "potion", Name: "Potion", Price: 25},
		{ID: "hi_potion", Name: "Hi-Potion", Price: 60},
		{ID: "revive", Name: "Revive Dust", Price: 100},
		{ID: "capture_film", Name: "Capture Film", Price: 40},
	}
}

func Find(id string) (CatalogItem, bool) {
	for _, it := range DefaultCatalog() {
		if it.ID == id {
			return it, true
		}
	}
	return CatalogItem{}, false
}
