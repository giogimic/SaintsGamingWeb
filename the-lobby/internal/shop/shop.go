package shop

import "github.com/giogimic/SaintsGamingWeb/the-lobby/internal/registry"

// CatalogItem is a buyable shop row.
type CatalogItem struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Price int    `json:"price"`
}

// GenerateCatalog pulls available consumable/tools from the registry.
func GenerateCatalog(reg *registry.Manager) []CatalogItem {
	if reg == nil {
		return []CatalogItem{}
	}
	var out []CatalogItem
	// We only show items in the registry
	for _, slug := range reg.AllItemSlugs() {
		if it, ok := reg.GetItem(slug); ok {
			// For Phase B, infer price from Tier or arbitrary defaults, since DB lacks a explicit Price column
			price := it.Tier * 25
			if price == 0 {
				price = 25
			}
			out = append(out, CatalogItem{
				ID:    it.Slug,
				Name:  it.Name,
				Price: price,
			})
		}
	}
	// Fallback if empty (for completely empty DBs)
	if len(out) == 0 {
		return []CatalogItem{
			{ID: "potion", Name: "Potion", Price: 25},
			{ID: "capture_film", Name: "Capture Film", Price: 40},
		}
	}
	return out
}

func Find(reg *registry.Manager, id string) (CatalogItem, bool) {
	for _, it := range GenerateCatalog(reg) {
		if it.ID == id {
			return it, true
		}
	}
	return CatalogItem{}, false
}
