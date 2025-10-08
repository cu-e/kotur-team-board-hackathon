type Id = string;

function norm(s: string): string {
  return s.normalize('NFKD').toLowerCase();
}
function tokenize(s: string): string[] {
  return norm(s)
    .split(/[^a-zа-яё0-9]+/i)
    .filter(Boolean);
}

class TokenIndex {
  private byToken = new Map<string, Set<Id>>();
  private payload = new Map<Id, string>();

  upsert(id: Id, text: string) {
    this.remove(id);
    const toks = new Set(tokenize(text));
    this.payload.set(id, text);
    toks.forEach((t) => {
      let set = this.byToken.get(t);
      if (!set) {
        set = new Set();
        this.byToken.set(t, set);
      }
      set.add(id);
    });
  }
  remove(id: Id) {
    if (!this.payload.has(id)) return;
    const text = this.payload.get(id)!;
    const toks = new Set(tokenize(text));
    toks.forEach((t) => {
      const set = this.byToken.get(t);
      if (set) {
        set.delete(id);
        if (set.size === 0) this.byToken.delete(t);
      }
    });
    this.payload.delete(id);
  }
  search(q: string, limit = 10): Id[] {
    const toks = tokenize(q);
    if (toks.length === 0) return [];
    // пересечение сетов
    let acc: Set<Id> | null = null;
    for (const t of toks) {
      const set = this.byToken.get(t);
      if (!set) return [];
      acc = acc ? new Set([...acc].filter((x) => set.has(x))) : new Set(set);
      if (acc.size === 0) return [];
    }
    // сортируем по startsWith и длине
    const arr = [...acc];
    const qn = norm(q);
    return arr
      .map((id) => ({ id, text: this.payload.get(id) || '' }))
      .sort((a, b) => {
        const as = norm(a.text).startsWith(qn) ? 0 : 1;
        const bs = norm(b.text).startsWith(qn) ? 0 : 1;
        if (as !== bs) return as - bs;
        return a.text.length - b.text.length;
      })
      .slice(0, limit)
      .map((x) => x.id);
  }
}

export class SearchIndex {
  // per group
  private static members = new Map<string, TokenIndex>();
  private static tags = new Map<string, TokenIndex>();

  static ensure(groupId: string) {
    if (!this.members.has(groupId)) this.members.set(groupId, new TokenIndex());
    if (!this.tags.has(groupId)) this.tags.set(groupId, new TokenIndex());
  }
  static reindexMembers(groupId: string, list: Array<{ id: string; name: string }>) {
    this.ensure(groupId);
    const idx = this.members.get(groupId)!;
    // полная переиндексация
    (idx as any).byToken = new Map();
    (idx as any).payload = new Map();
    list.forEach((m) => idx.upsert(m.id, m.name));
  }
  static upsertMember(groupId: string, userId: string, name: string) {
    this.ensure(groupId);
    this.members.get(groupId)!.upsert(userId, name);
  }
  static removeMember(groupId: string, userId: string) {
    this.members.get(groupId)?.remove(userId);
  }

  static reindexTags(groupId: string, list: Array<{ id: string; name: string }>) {
    this.ensure(groupId);
    const idx = this.tags.get(groupId)!;
    (idx as any).byToken = new Map();
    (idx as any).payload = new Map();
    list.forEach((t) => idx.upsert(t.id, t.name));
  }
  static upsertTag(groupId: string, tagId: string, name: string) {
    this.ensure(groupId);
    this.tags.get(groupId)!.upsert(tagId, name);
  }
  static removeTag(groupId: string, tagId: string) {
    this.tags.get(groupId)?.remove(tagId);
  }

  static search(groupId: string, type: 'member' | 'tag', q: string, limit = 10): string[] {
    this.ensure(groupId);
    const idx = type === 'member' ? this.members.get(groupId)! : this.tags.get(groupId)!;
    return idx.search(q, limit);
  }
}
