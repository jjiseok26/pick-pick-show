"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { createBalancedGroups, createNumberedParticipants, parseParticipantNames, parseStoredClasses, pickUnselectedMember, StoredClass } from "./participant-utils";

const C = {
  participants: ["\uBBFC\uC11C", "\uC900\uD638", "\uC11C\uC724", "\uC9C0\uC6B0", "\uD604\uC6B0", "\uD558\uB9B0"],
  brandLabel: "\uD53D\uD53D\uC1FC",
  eyebrow: "\uB450\uADFC\uB450\uADFC \uB79C\uB364 \uC2A4\uD14C\uC774\uC9C0",
  titlePrefix: "\uC624\uB298\uC758 ",
  titleStrong: "\uBC1C\uD45C\uC790",
  titleSuffix: "\uB294?",
  current: "\uD604\uC7AC \uCC38\uAC00\uC790",
  people: "\uBA85",
  waitingRoom: "\uCD9C\uC5F0\uC790 \uB300\uAE30\uC2E4",
  addParticipant: "\uCC38\uAC00\uC790 \uCD94\uAC00",
  nameInput: "이름을 줄바꿈, 쉼표 또는 탭으로 구분해 입력",
  add: "\uCD94\uAC00",
  delete: "\uC0AD\uC81C",
  stageTitle: "\uC624\uB298 \uBB34\uB300\uC758 \uC8FC\uC778\uACF5",
  congratulations: "\uCD95\uD558\uD569\uB2C8\uB2E4!",
  drawing: "\uCD94\uCCA8 \uC911!",
  newRound: "\uC0C8 \uB77C\uC6B4\uB4DC",
  start: "\uCD94\uCCA8 \uC2DC\uC791",
  remaining: "\uC774\uBC88 \uB77C\uC6B4\uB4DC \uB0A8\uC740 \uC0AC\uB78C",
  fair: "\uC911\uBCF5 \uC5C6\uC774 \uACF5\uC815\uD558\uAC8C!",
  history: "\uC9C0\uB09C \uBC1C\uD45C\uC790",
  justPicked: "\uBC29\uAE08 \uB2F9\uCCA8!",
  completed: "\uBC1C\uD45C \uC644\uB8CC",
  quiet: "\uC544\uC9C1 \uC870\uC6A9\uD574\uC694...",
  emptyLine1: "\uCCAB \uBC88\uC9F8 \uBC84\uC800\uB97C \uB20C\uB7EC",
  emptyLine2: "\uBA85\uC608\uC758 \uC804\uB2F9\uC744 \uCC44\uC6CC\uBCF4\uC138\uC694!",
  reset: "\uB77C\uC6B4\uB4DC \uCD08\uAE30\uD654",
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_PARTICIPANTS = 1000;
const STORAGE_KEY = "pick-pick-show-classes-v1";
const DEFAULT_CLASSES: StoredClass[] = [{ id: "class-1", name: "1반", participants: C.participants }];
type Phase = "idle" | "countdown" | "shuffle" | "winner";
type SideView = "history" | "groups";

export default function Home() {
  const [classes, setClasses] = useState<StoredClass[]>(DEFAULT_CLASSES);
  const [activeClassId, setActiveClassId] = useState(DEFAULT_CLASSES[0].id);
  const [storageReady, setStorageReady] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [studentCount, setStudentCount] = useState(30);
  const [display, setDisplay] = useState("?");
  const [phase, setPhase] = useState<Phase>("idle");
  const [drawing, setDrawing] = useState(false);
  const [burst, setBurst] = useState(0);
  const [sideView, setSideView] = useState<SideView>("history");
  const [groupCount, setGroupCount] = useState(4);
  const [groups, setGroups] = useState<string[][]>([]);
  const [groupPicks, setGroupPicks] = useState<Record<number, string[]>>({});
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [message, setMessage] = useState("\uBC84\uC800\uB97C \uB204\uB974\uBA74 \uCE74\uC6B4\uD2B8\uB2E4\uC6B4\uC774 \uC2DC\uC791\uB3FC\uC694!");
  const activeClass = classes.find((studentClass) => studentClass.id === activeClassId) ?? classes[0];
  const participants = activeClass?.participants ?? [];
  const remaining = participants.filter((name) => !history.includes(name));
  const activeGroup = activeGroupIndex === null ? null : groups[activeGroupIndex] ?? null;
  const activeGroupPicks = activeGroupIndex === null ? [] : groupPicks[activeGroupIndex] ?? [];
  const activeGroupRemaining = activeGroup?.filter((name) => !activeGroupPicks.includes(name)) ?? [];
  const visibleParticipants = activeGroup ?? participants;
  const activeGroupWinner = activeGroupPicks.at(-1);
  const activeGroupNumber = activeGroupIndex === null ? null : activeGroupIndex + 1;

  useEffect(() => {
    const storedClasses = parseStoredClasses(localStorage.getItem(STORAGE_KEY));
    const timer = window.setTimeout(() => {
      if (storedClasses.length) {
        setClasses(storedClasses);
        setActiveClassId(storedClasses[0].id);
      }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (storageReady) localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
  }, [classes, storageReady]);

  function updateParticipants(update: (current: string[]) => string[]) {
    setClasses((current) => current.map((studentClass) => studentClass.id === activeClassId ? { ...studentClass, participants: update(studentClass.participants) } : studentClass));
  }

  function playTone(frequency: number, duration = 0.09, delay = 0, volume = 0.06, type: OscillatorType = "sine") {
    if (!soundEnabled) return;
    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;

    const schedule = () => {
      const start = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration);
    };

    if (context.state === "suspended") void context.resume().then(schedule);
    else schedule();
  }

  async function startDraw() {
    const groupIndex = activeGroupIndex;
    const group = groupIndex === null ? null : groups[groupIndex] ?? null;
    const picked = groupIndex === null ? [] : groupPicks[groupIndex] ?? [];
    if (drawing || (group ? group.length === 0 : participants.length < 2)) return;
    let pool = group ? group.filter((name) => !picked.includes(name)) : remaining;
    let previousHistory = history;
    if (pool.length === 0) {
      pool = group ?? participants;
      if (!group) {
        previousHistory = [];
        setHistory([]);
      }
    }

    setDrawing(true);
    setPhase("countdown");
    setMessage("\uB450\uADFC\uB450\uADFC\uB450\uADFC...");
    for (const count of [3, 2, 1]) {
      setDisplay(String(count));
      playTone(330 + count * 90, 0.13, 0, 0.07, "square");
      await wait(620);
    }

    setPhase("shuffle");
    for (let tick = 0; tick < 15; tick += 1) {
      setDisplay(pickUnselectedMember(pool, []) ?? "?");
      playTone(190 + tick * 16, 0.045, 0, 0.035, "square");
      await wait(70 + tick * 11);
    }

    const selected = pickUnselectedMember(pool, []);
    if (!selected) {
      setDrawing(false);
      return;
    }
    setDisplay(selected);
    setPhase("winner");
    if (group && groupIndex !== null) {
      const nextPicks = picked.length >= group.length ? [selected] : [...picked, selected];
      setGroupPicks((current) => ({ ...current, [groupIndex]: nextPicks }));
      setMessage(`${groupIndex + 1}모둠 발표자는 ${selected} 님이에요!`);
    } else {
      setHistory([selected, ...previousHistory]);
      setMessage(`${selected} \uB2D8, \uBB34\uB300\uB85C \uB098\uC640\uC8FC\uC138\uC694!`);
    }
    [523, 659, 784, 1047].forEach((frequency, index) => playTone(frequency, 0.28, index * 0.12, 0.08, "triangle"));
    setBurst((value) => value + 1);
    setDrawing(false);
  }

  function addParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const names = parseParticipantNames(newName);
    if (!names.length) return;
    const available = MAX_PARTICIPANTS - participants.length;
    if (available <= 0) {
      setMessage("한 반에는 최대 1,000명까지 입력할 수 있어요.");
      return;
    }

    const existing = new Set(participants);
    const added: string[] = [];
    names.forEach((name) => {
      if (name.length <= 12 && !existing.has(name) && added.length < available) {
        existing.add(name);
        added.push(name);
      }
    });
    if (!added.length) {
      setMessage("중복된 이름이거나 이름이 12자를 넘었어요.");
      return;
    }

    updateParticipants((current) => [...current, ...added]);
    setNewName("");
    setGroups([]);
    setGroupPicks({});
    setActiveGroupIndex(null);
    const skipped = names.length - added.length;
    setMessage(`${added.length}명이 대기실에 입장했어요.${skipped ? ` ${skipped}명은 중복·글자 수·정원 제한으로 제외했어요.` : ""}`);
  }

  function createNumberedRoster(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const names = createNumberedParticipants(studentCount);
    if (!names.length) return;
    updateParticipants(() => names);
    resetDrawState();
    setMessage(`${activeClass.name} 명단을 1번부터 ${names.length}번까지 만들었어요.`);
  }

  function resetDrawState() {
    setHistory([]);
    setGroups([]);
    setGroupPicks({});
    setActiveGroupIndex(null);
    setDisplay("?");
    setPhase("idle");
  }

  function switchClass(id: string) {
    if (drawing || id === activeClassId) return;
    const nextClass = classes.find((studentClass) => studentClass.id === id);
    if (!nextClass) return;
    setActiveClassId(id);
    setNewName("");
    resetDrawState();
    setMessage(`${nextClass.name} 명단을 불러왔어요.`);
  }

  function addClass() {
    if (drawing) return;
    const id = crypto.randomUUID();
    const name = `${classes.length + 1}반`;
    setClasses((current) => [...current, { id, name, participants: [] }]);
    setActiveClassId(id);
    setNewName("");
    resetDrawState();
    setMessage(`${name}을 추가했어요. 학생 명단을 입력해주세요.`);
  }

  function removeParticipant(name: string) {
    if (drawing) return;
    updateParticipants((names) => names.filter((participant) => participant !== name));
    setHistory((names) => names.filter((participant) => participant !== name));
    setGroups([]);
    setActiveGroupIndex(null);
    if (display === name) {
      setDisplay("?");
      setPhase("idle");
    }
  }

  function resetRound() {
    if (drawing) return;
    setHistory([]);
    setDisplay("?");
    setPhase("idle");
    setMessage("\uC0C8 \uB77C\uC6B4\uB4DC \uC900\uBE44 \uC644\uB8CC! \uBC84\uC800\uB97C \uB20C\uB7EC\uC8FC\uC138\uC694.");
  }

  function makeGroups() {
    if (drawing || participants.length < 2) return;
    const count = Math.min(Math.max(groupCount, 2), participants.length, 10);
    setGroupCount(count);
    setGroups(createBalancedGroups(participants, count));
    setGroupPicks({});
    setActiveGroupIndex(null);
    setSideView("groups");
    setMessage(`${participants.length}명을 ${count}개 모둠으로 골고루 편성했어요!`);
    [260, 390, 520].forEach((frequency, index) => playTone(frequency, 0.14, index * 0.08, 0.05, "triangle"));
  }

  function prepareGroupDraw(index: number) {
    if (drawing || !groups[index]?.length) return;
    setActiveGroupIndex(index);
    setSideView("groups");
    setDisplay("?");
    setPhase("idle");
    setMessage(`${index + 1}모둠이 왼쪽 대기실에 준비됐어요. 가운데 버저를 눌러주세요!`);
    [260, 390, 520].forEach((frequency, toneIndex) => playTone(frequency, 0.12, toneIndex * 0.08, 0.05, "triangle"));
  }

  function showAllParticipants() {
    if (drawing) return;
    setActiveGroupIndex(null);
    setDisplay("?");
    setPhase("idle");
    setMessage("전체 참가자 추첨 모드로 돌아왔어요.");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-sticker" aria-label={C.brandLabel}>PICK! PICK! SHOW</div>
        <div className="headline"><p>{C.eyebrow}</p><h1>{C.titlePrefix}<strong>{C.titleStrong}</strong>{C.titleSuffix}</h1></div>
        <div className="header-actions">
          <button type="button" className="sound-toggle" aria-pressed={soundEnabled} onClick={() => setSoundEnabled((enabled) => !enabled)}>
            <span aria-hidden="true">{soundEnabled ? "🔊" : "🔇"}</span>{soundEnabled ? "사운드 켜짐" : "사운드 꺼짐"}
          </button>
          <div className="count-card" aria-label={`${C.current} ${participants.length}${C.people}`}><span>{C.current}</span><strong>{participants.length}</strong><span>{C.people}</span></div>
        </div>
      </header>

      <div className="show-layout">
        <section className="panel participants-panel" aria-labelledby="participants-title">
          <div className="panel-heading"><h2 id="participants-title">{activeGroupNumber === null ? C.waitingRoom : `${activeGroupNumber}모둠 추첨 대기실`}</h2><span>{activeGroupNumber === null ? "READY TO PRESENT" : `GROUP ${activeGroupNumber} ON STAGE`}</span></div>
          {!activeGroup && <>
            <div className="class-tabs" role="tablist" aria-label="반별 학생 명단">
              {classes.map((studentClass) => <button type="button" role="tab" aria-selected={studentClass.id === activeClassId} onClick={() => switchClass(studentClass.id)} disabled={drawing} key={studentClass.id}>{studentClass.name}<span>{studentClass.participants.length}</span></button>)}
              <button type="button" className="add-class-button" onClick={addClass} disabled={drawing}>+ 반 추가</button>
            </div>
            <div className="roster-tools">
              <form className="add-form" onSubmit={addParticipant}>
                <label htmlFor="new-name">학생 명단 붙여넣기</label>
                <div><textarea id="new-name" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={C.nameInput} maxLength={16000} rows={3} disabled={drawing} /><button type="submit" disabled={drawing}>{C.add}</button></div>
                <p>여러 줄·쉼표·탭으로 구분 · 한 반 최대 1,000명 · 이름당 최대 12자</p>
              </form>
              <form className="number-form" onSubmit={createNumberedRoster}>
                <label htmlFor="student-count">학생 수로 만들기</label>
                <div><input id="student-count" type="number" min="1" max={MAX_PARTICIPANTS} value={studentCount} onChange={(event) => setStudentCount(Number(event.target.value))} disabled={drawing} /><button type="submit" disabled={drawing}>1~{Math.min(Math.max(Math.trunc(studentCount) || 0, 0), MAX_PARTICIPANTS)} 만들기</button></div>
                <p>현재 반 명단을 입력한 학생 수의 번호로 바꿔요.</p>
              </form>
            </div>
          </>}
          <ul className="participant-list">
            {visibleParticipants.map((name, index) => (
              <li className={`participant ${activeGroupPicks.includes(name) ? "participant-picked" : ""}`} key={name}>
                <span className="number">{String(index + 1).padStart(2, "0")}</span><span>{name}</span>
                {activeGroup ? <span className="picked-badge">{activeGroupWinner === name ? "방금!" : activeGroupPicks.includes(name) ? "완료" : "대기"}</span> : <button type="button" className="remove-button" onClick={() => removeParticipant(name)} disabled={drawing} aria-label={`${name} ${C.delete}`}>x</button>}
              </li>
            ))}
          </ul>
          {activeGroup && <div className="group-draw-info"><strong>{activeGroupNumber}모둠 추첨 모드</strong><span>가운데 큰 버저를 눌러 발표자를 뽑아주세요.</span><button type="button" onClick={showAllParticipants} disabled={drawing}>전체 참가자 보기</button></div>}
        </section>

        <section className={`stage phase-${phase}`} aria-labelledby="stage-title">
          <div className="on-air"><span aria-hidden="true" />ON AIR</div>
          <div className="screen-shell"><div className="screen" aria-live="assertive" aria-atomic="true"><p id="stage-title">{activeGroupNumber === null ? C.stageTitle : `${activeGroupNumber}모둠 발표자`}</p><strong className="mystery-name">{display}</strong><span>{phase === "winner" ? C.congratulations : "WHO WILL IT BE?"}</span></div></div>
          <div className="tension-line"><span />{activeGroup ? "GROUP DRAW" : "READY?"}<span /></div>
          <div className="buzzer-base"><button type="button" className="draw-button" onClick={startDraw} disabled={drawing || (activeGroup ? !activeGroup.length : participants.length < 2)}>{drawing ? C.drawing : activeGroup ? activeGroupRemaining.length ? `${activeGroupNumber}모둠 추첨` : "새 순서 추첨" : remaining.length === 0 && history.length ? C.newRound : C.start}</button></div>
          <p className="stage-message" role="status">{message}</p>
          <p className="fairness">{activeGroup ? `${activeGroupNumber}모둠 남은 사람` : C.remaining} <strong>{activeGroup ? activeGroupRemaining.length : remaining.length}</strong>{C.people} | {C.fair}</p>
          {phase === "winner" && <div className="confetti" key={burst} aria-hidden="true">{Array.from({ length: 28 }, (_, index) => <i key={index} style={{ left: `${(index * 37) % 100}%`, animationDelay: `${(index % 7) * 45}ms`, backgroundColor: ["#f04f3d", "#164bc5", "#ffd44d", "#fffaf0"][index % 4] }} />)}</div>}
        </section>

        <aside className="panel history-panel" aria-labelledby="side-panel-title">
          <div className="panel-heading red"><h2 id="side-panel-title">{sideView === "history" ? C.history : "랜덤 모둠 편성"}</h2><span>{sideView === "history" ? "HALL OF FAME" : "TEAM MAKER"}</span></div>
          <div className="panel-tabs" role="tablist" aria-label="결과 패널">
            <button type="button" role="tab" aria-selected={sideView === "history"} onClick={() => { setSideView("history"); showAllParticipants(); }} disabled={drawing}>발표 기록</button>
            <button type="button" role="tab" aria-selected={sideView === "groups"} onClick={() => setSideView("groups")} disabled={drawing}>모둠 편성</button>
          </div>
          {sideView === "history" ? <>
            {history.length ? <ol className="history-list">{history.map((name, index) => <li key={`${name}-${index}`}><span className="rank">{history.length - index}</span><div><strong>{name}</strong><span>{index === 0 ? C.justPicked : C.completed}</span></div></li>)}</ol> : <div className="empty-history"><strong>{C.quiet}</strong><span>{C.emptyLine1}<br />{C.emptyLine2}</span></div>}
            <button type="button" className="reset-button" onClick={resetRound} disabled={drawing || !history.length}>{C.reset}</button>
          </> : <div className="groups-view">
            <div className="group-controls">
              <label htmlFor="group-count">모둠 수</label>
              <input id="group-count" type="number" min="2" max={Math.max(2, Math.min(10, participants.length))} value={Math.min(groupCount, Math.max(2, Math.min(10, participants.length)))} onChange={(event) => setGroupCount(Number(event.target.value))} disabled={drawing || participants.length < 2} />
              <button type="button" onClick={makeGroups} disabled={drawing || participants.length < 2}>{groups.length ? "다시 섞기" : "랜덤 편성"}</button>
            </div>
            {groups.length ? <div className="group-grid">{groups.map((group, index) => {
              const picks = groupPicks[index] ?? [];
              const selected = picks.at(-1);
              const groupRemaining = Math.max(group.length - picks.length, 0);
              return <section className={`group-card ${activeGroupIndex === index ? "active" : ""}`} key={`${index}-${group.join("-")}`}><h3>{index + 1}모둠 <span>{group.length}명</span></h3><ul>{group.map((name) => <li className={selected === name ? "picked" : ""} key={name}>{name}</li>)}</ul><div className="group-pick"><span>이번 발표자</span><strong>{selected ?? "?"}</strong><button type="button" onClick={() => prepareGroupDraw(index)} disabled={drawing}>{!selected ? "왼쪽에서 뽑기" : groupRemaining ? "다음 발표자 준비" : "새 순서 준비"}</button><small>{selected ? `이번 순서 남은 인원 ${groupRemaining}명` : "왼쪽 대기실로 보내 긴장감 있게 뽑아요"}</small></div></section>;
            })}</div> : <div className="empty-groups"><strong>몇 모둠으로 나눌까요?</strong><span>모둠 수를 고르고 랜덤 편성을 눌러주세요.<br />인원 차이는 최대 1명으로 맞춰드려요.</span></div>}
          </div>}
        </aside>
      </div>
    </main>
  );
}
