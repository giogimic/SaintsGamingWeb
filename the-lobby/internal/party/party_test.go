package party_test

import (
	"testing"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/party"
)

func TestPartyLifecycle(t *testing.T) {
	mgr := party.NewManager()

	leader := "acc_leader_1"
	member1 := "acc_member_1"
	member2 := "acc_member_2"

	// Invite member1
	mgr.Invite(leader, member1)

	// Before accept, no party
	if p := mgr.Get(member1); p != nil {
		t.Fatalf("expected nil party before accept, got %+v", p)
	}

	// Accept member1
	p1 := mgr.Accept(member1)
	if p1 == nil {
		t.Fatal("expected party after accept, got nil")
	}
	if p1.LeaderID != leader {
		t.Fatalf("expected leader %s, got %s", leader, p1.LeaderID)
	}
	if len(p1.Members) != 2 {
		t.Fatalf("expected 2 members, got %d", len(p1.Members))
	}

	// Invite & Accept member2
	mgr.Invite(leader, member2)
	p2 := mgr.Accept(member2)
	if p2 == nil || len(p2.Members) != 3 {
		t.Fatalf("expected 3 members in party, got %+v", p2)
	}

	// Member1 leaves
	mgr.Leave(member1)
	if p := mgr.Get(member1); p != nil {
		t.Fatalf("expected member1 to have no party after leave, got %+v", p)
	}
	if pLead := mgr.Get(leader); pLead == nil || len(pLead.Members) != 2 {
		t.Fatalf("expected leader party to have 2 members after member1 left, got %+v", pLead)
	}

	// Leader leaves -> disband
	mgr.Leave(leader)
	if p := mgr.Get(leader); p != nil {
		t.Fatalf("expected no party after leader leave, got %+v", p)
	}
	if p := mgr.Get(member2); p != nil {
		t.Fatalf("expected member2 to have no party after disband, got %+v", p)
	}
}
