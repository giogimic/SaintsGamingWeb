export class EntityManager {
  private currentId = 0;
  
  // Tracks mapping of account IDs to active entity IDs
  private accountToEntity = new Map<string, string>();

  public generateId(prefix: 'player' | 'npc' | 'obj' | 'creature'): string {
    this.currentId++;
    return `${prefix}_${this.currentId}_${Date.now()}`;
  }

  public registerPlayerEntity(accountId: string, entityId: string) {
    this.accountToEntity.set(accountId, entityId);
  }

  public getEntityForAccount(accountId: string): string | undefined {
    return this.accountToEntity.get(accountId);
  }
  
  public removeAccountLink(accountId: string) {
    this.accountToEntity.delete(accountId);
  }
}
