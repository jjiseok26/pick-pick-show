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
  groups: string[][];
  groupPicks: Record<number, string[]>;
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
      const { id, name, participants, groups, groupPicks } = item as Partial<StoredClass>;
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

      const participantSet = new Set(validParticipants);
      const groupedNames = new Set<string>();
      const rawGroups = Array.isArray(groups) ? groups : [];
      let groupsAreValid = rawGroups.length >= 2 && rawGroups.length <= 10;
      const validGroups = groupsAreValid ? rawGroups.map((group) => {
        if (!Array.isArray(group)) {
          groupsAreValid = false;
          return [];
        }
        return group.flatMap((member) => {
          if (typeof member !== "string") {
            groupsAreValid = false;
            return [];
          }
          const trimmed = member.trim();
          if (!participantSet.has(trimmed) || groupedNames.has(trimmed)) {
            groupsAreValid = false;
            return [];
          }
          groupedNames.add(trimmed);
          return [trimmed];
        });
      }) : [];
      const storedGroups = groupsAreValid && groupedNames.size === validParticipants.length ? validGroups : [];
      const rawPicks = groupPicks && typeof groupPicks === "object" ? groupPicks as Record<number, unknown> : {};
      const storedPicks = storedGroups.reduce<Record<number, string[]>>((result, group, index) => {
        const selected = rawPicks[index];
        if (Array.isArray(selected)) result[index] = selected.filter((member, memberIndex) => typeof member === "string" && group.includes(member) && selected.indexOf(member) === memberIndex) as string[];
        return result;
      }, {});

      return [{ id, name: name.trim(), participants: validParticipants, groups: storedGroups, groupPicks: storedPicks }];
    });
  } catch {
    return [];
  }
}

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function createGroupsCsv(groups: string[][]) {
  const rows = [["모둠", "학생"]];
  groups.forEach((group, index) => {
    if (group.length) group.forEach((name) => rows.push([String(index + 1), name]));
    else rows.push([String(index + 1), ""]);
  });
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function parseCsvRows(value: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quoted) {
      if (character === '"' && value[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }

  if (quoted) throw new Error("CSV의 따옴표가 닫히지 않았어요.");
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

export function parseGroupsCsv(value: string, participants: string[]) {
  const rows = parseCsvRows(value.replace(/^\uFEFF/, ""));
  const header = rows.shift()?.map((cell) => cell.trim().toLowerCase());
  if (!header || !["모둠", "group"].includes(header[0]) || !["학생", "student"].includes(header[1])) throw new Error("CSV 첫 줄은 '모둠,학생'이어야 해요.");

  const participantSet = new Set(participants);
  const imported = new Set<string>();
  const usedGroupNumbers = new Set<number>();
  const groups: string[][] = [];
  rows.forEach((row, index) => {
    if (row.every((cell) => !cell.trim())) return;
    if (row.length !== 2) throw new Error(`${index + 2}번째 줄의 열 개수를 확인해주세요.`);
    const groupNumber = Number(row[0].trim());
    const name = row[1].trim();
    if (!Number.isInteger(groupNumber) || groupNumber < 1 || groupNumber > 10) throw new Error(`${index + 2}번째 줄의 모둠 번호는 1~10 사이여야 해요.`);
    usedGroupNumbers.add(groupNumber);
    while (groups.length < groupNumber) groups.push([]);
    if (!name) return;
    if (!participantSet.has(name)) throw new Error(`${index + 2}번째 줄의 '${name}' 학생은 현재 반 명단에 없어요.`);
    if (imported.has(name)) throw new Error(`${name} 학생이 CSV에 두 번 들어 있어요.`);
    imported.add(name);
    groups[groupNumber - 1].push(name);
  });

  if (groups.length < 2 || groups.some((_, index) => !usedGroupNumbers.has(index + 1))) throw new Error("모둠 번호는 1번부터 빠짐없이 입력해주세요.");
  const missing = participants.filter((name) => !imported.has(name));
  if (missing.length) throw new Error(`현재 반 학생 ${missing.length}명이 CSV에 없어요.`);
  return groups;
}

export function moveGroupMember(groups: string[][], name: string, fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || !groups[fromIndex]?.includes(name) || !groups[toIndex]) return groups;
  return groups.map((group, index) => index === fromIndex ? group.filter((member) => member !== name) : index === toIndex ? [...group, name] : group);
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
