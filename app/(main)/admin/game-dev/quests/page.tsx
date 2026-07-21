'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollText, Plus, Trash2, Shield, Gift, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { createGameQuest, deleteGameQuest, fetchAllGameQuests } from '@/app/actions/game-dev';

export default function QuestCreatorPage() {
  const [quests, setQuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [npcId, setNpcId] = useState('npc-1');
  const [description, setDescription] = useState('');
  const [dialogStart, setDialogStart] = useState('');
  const [dialogProgress, setDialogProgress] = useState('');
  const [dialogComplete, setDialogComplete] = useState('');
  const [reqItemId, setReqItemId] = useState('');
  const [reqAmount, setReqAmount] = useState('1');
  const [reqSkillId, setReqSkillId] = useState('');
  const [reqLevel, _setReqLevel] = useState('1');
  const [rewardXp, setRewardXp] = useState('50');
  const [rewardCredits, setRewardCredits] = useState('100');
  const [rewardItemId, setRewardItemId] = useState('');
  const [rewardAmount, setRewardAmount] = useState('1');

  const loadQuests = async () => {
    setLoading(true);
    const res = await fetchAllGameQuests();
    if (res.success) {
      setQuests(res.data);
    } else {
      toast.error('Failed to load quests.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadQuests();
  }, []);

  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !dialogStart.trim()) {
      toast.error('Please fill in required quest fields.');
      return;
    }

    setSaving(true);
    const res = await createGameQuest({
      name,
      npcId,
      description,
      dialogStart,
      dialogProgress: dialogProgress || dialogStart,
      dialogComplete: dialogComplete || dialogStart,
      reqItemId: reqItemId.trim() || undefined,
      reqAmount: parseInt(reqAmount) || 0,
      reqSkillId: reqSkillId.trim() || undefined,
      reqLevel: parseInt(reqLevel) || 0,
      rewardXp: parseInt(rewardXp) || 0,
      rewardCredits: parseInt(rewardCredits) || 0,
      rewardItemId: rewardItemId.trim() || undefined,
      rewardAmount: parseInt(rewardAmount) || 0,
    });

    if (res.success) {
      toast.success(`Quest "${name}" created successfully!`);
      setName('');
      setDescription('');
      setDialogStart('');
      setDialogProgress('');
      setDialogComplete('');
      setReqItemId('');
      setRewardItemId('');
      loadQuests();
    } else {
      toast.error(res.error || 'Failed to create quest.');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, questName: string) => {
    if (!confirm(`Are you sure you want to delete "${questName}"?`)) return;
    const res = await deleteGameQuest(id);
    if (res.success) {
      toast.success('Quest deleted.');
      loadQuests();
    } else {
      toast.error('Failed to delete quest.');
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <ScrollText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Quest Creator & Manager</h1>
          <p className="text-muted-foreground">Build narrative dialogues, requirements, and rewards for Saints MMO NPCs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creation Form */}
        <Card className="lg:col-span-1 border-primary/20 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Create New Quest
            </CardTitle>
            <CardDescription>Define dialogues, item turn-ins, and player payouts.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateQuest} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quest Title *</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. A Sturdy Start" required />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Anchor NPC ID</label>
                  <Input value={npcId} onChange={e => setNpcId(e.target.value)} placeholder="e.g. npc-1" required />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Req Skill ID</label>
                  <Input value={reqSkillId} onChange={e => setReqSkillId(e.target.value)} placeholder="e.g. Mining" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description *</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief summary shown in player quest log..." rows={2} required />
              </div>

              <div className="space-y-2 pt-2 border-t border-border/50">
                <span className="text-xs font-bold text-primary flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" /> Dialogue Sequences
                </span>
                <div>
                  <label className="text-xs text-muted-foreground">Offer Dialogue (Start)</label>
                  <Textarea value={dialogStart} onChange={e => setDialogStart(e.target.value)} placeholder="Welcome to town! Could you bring me..." rows={2} required />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Reminder Dialogue (In Progress)</label>
                  <Textarea value={dialogProgress} onChange={e => setDialogProgress(e.target.value)} placeholder="Have you gathered those items yet?" rows={2} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Completion Dialogue (Finished)</label>
                  <Textarea value={dialogComplete} onChange={e => setDialogComplete(e.target.value)} placeholder="Fantastic work! Here is your reward." rows={2} />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/50">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" /> Turn-in Requirements
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Input value={reqItemId} onChange={e => setReqItemId(e.target.value)} placeholder="Item ID (e.g. bronze_helm)" />
                  </div>
                  <div>
                    <Input type="number" value={reqAmount} onChange={e => setReqAmount(e.target.value)} placeholder="Qty" />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/50">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <Gift className="h-3.5 w-3.5" /> Rewards
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">XP Payout</label>
                    <Input type="number" value={rewardXp} onChange={e => setRewardXp(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Credits Payout</label>
                    <Input type="number" value={rewardCredits} onChange={e => setRewardCredits(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-[10px] text-muted-foreground">Reward Item ID</label>
                    <Input value={rewardItemId} onChange={e => setRewardItemId(e.target.value)} placeholder="e.g. patch_kit" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Reward Qty</label>
                    <Input type="number" value={rewardAmount} onChange={e => setRewardAmount(e.target.value)} />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full mt-4" disabled={saving}>
                {saving ? 'Creating Quest...' : 'Register Quest'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Quests List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Active Quest Database ({quests.length})</CardTitle>
            <CardDescription>Live quests active in the MMO system.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading quests...</p>
            ) : quests.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                <ScrollText className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No custom quests in database yet</p>
                <p className="text-xs text-muted-foreground mt-1">Use the form on the left to add your first quest.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {quests.map((q) => (
                  <div key={q.id} className="p-4 rounded-xl border border-border/60 bg-background/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base">{q.name}</h3>
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                          NPC: {q.npcId}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{q.description}</p>

                      <div className="flex flex-wrap gap-2 pt-2">
                        {q.reqItemId && (
                          <Badge variant="secondary" className="text-[10px]">
                            Req: {q.reqAmount}x {q.reqItemId}
                          </Badge>
                        )}
                        {q.rewardXp > 0 && (
                          <Badge variant="secondary" className="text-[10px] text-amber-400 bg-amber-500/10">
                            +{q.rewardXp} XP
                          </Badge>
                        )}
                        {q.rewardCredits > 0 && (
                          <Badge variant="secondary" className="text-[10px] text-emerald-400 bg-emerald-500/10">
                            +{q.rewardCredits} Credits
                          </Badge>
                        )}
                        {q.rewardItemId && (
                          <Badge variant="secondary" className="text-[10px] text-purple-400 bg-purple-500/10">
                            Reward: {q.rewardAmount}x {q.rewardItemId}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleDelete(q.id, q.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
