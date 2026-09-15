package persist

import (
	"bytes"
	"context"
	"database/sql"
	"log"
	"net/http"
	"time"
)

type OutboxWorker struct {
	db        *sql.DB
	nextJsUrl string
	secret    string
}

func NewOutboxWorker(db *sql.DB, nextJsUrl, secret string) *OutboxWorker {
	return &OutboxWorker{
		db:        db,
		nextJsUrl: nextJsUrl,
		secret:    secret,
	}
}

// Start begins processing the NextjsSyncOutbox in the background until ctx is canceled.
func (w *OutboxWorker) Start(ctx context.Context) {
	log.Println("[OutboxWorker] Starting background sync worker...")
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("[OutboxWorker] Shutting down, flushing remaining items...")
			w.flushAll()
			log.Println("[OutboxWorker] Shutdown complete.")
			return
		case <-ticker.C:
			w.processBatch()
		}
	}
}

func (w *OutboxWorker) flushAll() {
	// Attempt to process everything in the queue during shutdown
	for {
		processed := w.processBatch()
		if processed == 0 {
			break
		}
	}
}

func (w *OutboxWorker) processBatch() int {
	if w.db == nil || w.nextJsUrl == "" {
		return 0
	}

	rows, err := w.db.Query(`
SELECT id, accountId, characterId, payloadJson 
FROM NextjsSyncOutbox 
WHERE status = 'PENDING' 
ORDER BY id ASC LIMIT 50`)
	if err != nil {
		log.Printf("[OutboxWorker] Error querying outbox: %v", err)
		return 0
	}
	defer rows.Close()

	type item struct {
		id          int
		accountId   string
		characterId string
		payload     string
	}
	var items []item
	for rows.Next() {
		var it item
		if err := rows.Scan(&it.id, &it.accountId, &it.characterId, &it.payload); err == nil {
			items = append(items, it)
		}
	}
	rows.Close()

	if len(items) == 0 {
		return 0
	}

	processed := 0
	for _, it := range items {
		success := w.sendToNextJs(it.payload)
		if success {
			_, _ = w.db.Exec(`DELETE FROM NextjsSyncOutbox WHERE id = ?`, it.id)
			processed++
		}
	}

	return processed
}

func (w *OutboxWorker) sendToNextJs(payloadJson string) bool {
	req, err := http.NewRequest("POST", w.nextJsUrl+"/api/internal/character/location", bytes.NewBuffer([]byte(payloadJson)))
	if err != nil {
		return false
	}
	req.Header.Set("Authorization", "Bearer "+w.secret)
	req.Header.Set("X-Saints-Internal-Secret", w.secret)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		log.Printf("[OutboxWorker] Failed to reach Next.js: %v", err)
		return false
	}
	defer res.Body.Close()

	if res.StatusCode >= 200 && res.StatusCode < 300 {
		return true
	}
	
	log.Printf("[OutboxWorker] Next.js returned error status: %d", res.StatusCode)
	return false
}
