export function parseParticipantNames(value: string) {
  return value
    .split(/[\r\n,;\t]+/)
    .map((name) => name.trim())
    .filter(Boolean);
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
