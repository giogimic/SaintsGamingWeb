'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import RpgPanel from '../rpg-panel';
import { soundSynth } from '@/engine/sound-synth';
import { Landmark, ArrowDownToLine, ArrowUpFromLine, Loader2, Coins } from 'lucide-react';
import { getGlobalBankGold, depositToBank, withdrawFromBank } from '@/app/actions/game';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

export default function BankOverlay({ characterId }: { characterId: string }) {
  const player = useGameStore(state => state.player);
  const setGameMode = useGameStore(state => state.setGameMode);
  const showToast = useGameStore(state => state.showToast);
  
  const [bankGold, setBankGold] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getGlobalBankGold().then(res => {
      if (res.success) setBankGold(res.gold!);
    });
  }, []);

  const handleDeposit = async () => {
    const val = parseInt(amount);
    if (isNaN(val) || val <= 0) return;
    if (val > player.credits) {
      showToast('You do not have enough credits to deposit that amount.');
      return;
    }
    setLoading(true);
    const res = await depositToBank(characterId, val);
    if (res.success) {
      soundSynth?.playActionSound?.();
      setBankGold(prev => (prev || 0) + val);
      useGameStore.setState(s => { s.player.credits = res.newCharacterGold! });
      showToast(`Deposited ${val} Gold to your Global Bank.`);
      setAmount('');
    } else {
      showToast(res.error || 'Failed to deposit.');
    }
    setLoading(false);
  };

  const handleWithdraw = async () => {
    const val = parseInt(amount);
    if (isNaN(val) || val <= 0) return;
    if (bankGold === null || val > bankGold) {
      showToast('You do not have enough gold in your bank.');
      return;
    }
    setLoading(true);
    const res = await withdrawFromBank(characterId, val);
    if (res.success) {
      soundSynth?.playActionSound?.();
      setBankGold(res.newBankGold!);
      useGameStore.setState(s => { s.player.credits = res.newCharacterGold! });
      showToast(`Withdrew ${val} Gold from your Global Bank.`);
      setAmount('');
    } else {
      showToast(res.error || 'Failed to withdraw.');
    }
    setLoading(false);
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-auto bg-black/60 backdrop-blur-sm">
      <RpgPanel 
        title="GLOBAL BANK" 
        onClose={() => { soundSynth?.playUiClick?.(); setGameMode('EXPLORING'); }}
        icon={<Landmark className="w-5 h-5 text-yellow-500" />}
        className="w-full max-w-md mx-auto h-[80vh] flex flex-col pointer-events-auto"
        bodyClassName="p-0 overflow-y-auto"
      >

        {/* Balances */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/40 rounded-xl p-4 border border-primary/20 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Character Wallet</p>
              <div className="text-2xl font-bold text-yellow-500 flex justify-center items-center gap-2">
                <Coins className="w-5 h-5" />
                {player.credits.toLocaleString()}
              </div>
            </div>
            <div className="bg-black/40 rounded-xl p-4 border border-primary/20 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Global Bank</p>
              <div className="text-2xl font-bold text-yellow-400 flex justify-center items-center gap-2">
                <Landmark className="w-5 h-5" />
                {bankGold === null ? <Loader2 className="w-4 h-4 animate-spin" /> : bankGold.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Amount</label>
            <Input 
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="bg-black/50 border-primary/30 text-lg py-6"
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 bg-black/40 hover:bg-primary/20 border-primary/30 text-primary"
                onClick={handleDeposit}
                disabled={loading || !amount}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowDownToLine className="w-4 h-4 mr-2" />}
                Deposit
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 bg-black/40 hover:bg-primary/20 border-primary/30 text-primary"
                onClick={handleWithdraw}
                disabled={loading || !amount || bankGold === null}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowUpFromLine className="w-4 h-4 mr-2" />}
                Withdraw
              </Button>
            </div>
            <div className="flex justify-between gap-2 mt-2">
              <Button variant="ghost" size="sm" className="flex-1 text-xs opacity-50 hover:opacity-100" onClick={() => setAmount(player.credits.toString())}>Max Deposit</Button>
              <Button variant="ghost" size="sm" className="flex-1 text-xs opacity-50 hover:opacity-100" onClick={() => setAmount(bankGold?.toString() || '0')}>Max Withdraw</Button>
            </div>
          </div>
        </div>
      </RpgPanel>
    </div>
  );
}
