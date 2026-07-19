export function parseParticipantNames(value: string) {
  return value
    .split(/[\r\n,;\t]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export type StoredClass = {
  id: string;
  name: string;
  participants: string[];
};

export function createNumberedParticipants(count: number) {
  const safeCount = Math.min(1000, Math.max(0, Math.trunc(count)));
  return Array.from({ length: safeCount }, (_, index) => String(index + 1));
}

export function parseStoredClasses(value: string | null): StoredClass[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    const usedIds = new Set<string>();
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const { id, name, participants } = item as Partial<StoredClass>;
      if (typeof id !== "string" || !id || usedIds.has(id) || typeof name !== "string" || !name.trim() || !Array.isArray(participants)) return [];

      usedIds.add(id);
      const uniqueNames = new Set<string>();
      const validParticipants = participants.flatMap((participant) => {
        if (typeof participant !== "string") return [];
        const trimmed = participant.trim();
        if (!trimmed || trimmed.length > 12 || uniqueNames.has(trimmed)) return [];
        uniqueNames.add(trimmed);
        return [trimmed];
      }).slice(0, 1000);

      return [{ id, name: name.trim(), participants: validParticipants }];
    });
  } catch {
    return [];
  }
}

export function createBalancedGroups(
  participants: string[],
  groupCount: number,
  random = Math.random,
) {
  const shuffled = [...participants];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  const count = Math.max(1, Math.min(Math.trunc(groupCount), shuffled.length));
  const groups = Array.from({ length: count }, () => [] as string[]);
  shuffled.forEach((name, index) => groups[index % count].push(name));
  return groups;
}

export function pickUnselectedMember(
  members: string[],
  selected: string[],
  random = Math.random,
) {
  const remaining = members.filter((name) => !selected.includes(name));
  const pool = remaining.length ? remaining : members;
  return pool[Math.floor(random() * pool.length)] ?? null;
}
