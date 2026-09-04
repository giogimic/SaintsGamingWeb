package httpapi

import (
	"encoding/json"
	"io"
	"net/http"
)

type BroadcastHub interface {
	BroadcastAll(event string, payload any)
	EmitToRoom(room string, event string, payload any)
	EmitToSocket(socketID string, event string, payload any)
}

type BroadcastRequest struct {
	Envelope map[string]any `json:"envelope"`
	Options  struct {
		UserID *string `json:"userId"`
		Room   *string `json:"room"`
		Global *bool   `json:"global"`
	} `json:"options"`
}

func (s *Server) internalBroadcast(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !s.authorizeInternal(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if s.Hub == nil {
		http.Error(w, "hub not attached", http.StatusInternalServerError)
		return
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		http.Error(w, "bad body", http.StatusBadRequest)
		return
	}
	var req BroadcastRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	// We extract the "type" field from the envelope directly
	eventType := ""
	if typeVal, ok := req.Envelope["type"].(string); ok {
		eventType = typeVal
	} else {
		http.Error(w, "missing envelope type", http.StatusBadRequest)
		return
	}

	hub := s.Hub.(BroadcastHub)

	if req.Options.Global != nil && *req.Options.Global {
		hub.BroadcastAll(eventType, req.Envelope)
	} else if req.Options.Room != nil && *req.Options.Room != "" {
		hub.EmitToRoom(*req.Options.Room, eventType, req.Envelope)
	} else if req.Options.UserID != nil && *req.Options.UserID != "" {
		hub.EmitToRoom("user:"+*req.Options.UserID, eventType, req.Envelope)
	} else {
		http.Error(w, "missing target", http.StatusBadRequest)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) internalDisconnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !s.authorizeInternal(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if s.Hub == nil {
		http.Error(w, "hub not attached", http.StatusInternalServerError)
		return
	}

	var req struct {
		UserID string `json:"userId"`
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	
	if req.UserID != "" {
		hub := s.Hub.(BroadcastHub)
		hub.EmitToRoom("user:"+req.UserID, "force_disconnect", map[string]string{"reason": req.Reason})
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
