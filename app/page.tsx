"use client";

import { FormEvent, useRef, useState } from "react";

import { createBalancedGroups, parseParticipantNames } from "./participant-utils";

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
type Phase = "idle" | "countdown" | "shuffle" | "winner";
type SideView = "history" | "groups";

export default function Home() {
  const [participants, setParticipants] = useState(C.participants);
  const [history, setHistory] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [display, setDisplay] = useState("?");
  const [phase, setPhase] = useState<Phase>("idle");
  const [drawing, setDrawing] = useState(false);
  const [burst, setBurst] = useState(0);
  const [sideView, setSideView] = useState<SideView>("history");
  const [groupCount, setGroupCount] = useState(4);
  const [groups, setGroups] = useState<string[][]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [message, setMessage] = useState("\uBC84\uC800\uB97C \uB204\uB974\uBA74 \uCE74\uC6B4\uD2B8\uB2E4\uC6B4\uC774 \uC2DC\uC791\uB3FC\uC694!");
  const remaining = participants.filter((name) => !history.includes(name));

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
    if (drawing || participants.length < 2) return;
    let pool = remaining;
    let previousHistory = history;
    if (pool.length === 0) {
      pool = participants;
      previousHistory = [];
      setHistory([]);
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
      setDisplay(pool[Math.floor(Math.random() * pool.length)]);
      playTone(190 + tick * 16, 0.045, 0, 0.035, "square");
      await wait(70 + tick * 11);
    }

    const selected = pool[Math.floor(Math.random() * pool.length)];
    setDisplay(selected);
    setHistory([selected, ...previousHistory]);
    setPhase("winner");
    setMessage(`${selected} \uB2D8, \uBB34\uB300\uB85C \uB098\uC640\uC8FC\uC138\uC694!`);
    [523, 659, 784, 1047].forEach((frequency, index) => playTone(frequency, 0.28, index * 0.12, 0.08, "triangle"));
    setBurst((value) => value + 1);
    setDrawing(false);
  }

  function addParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const names = parseParticipantNames(newName);
    if (!names.length) return;
    const available = 20 - participants.length;
    if (available <= 0) {
      setMessage("\uD55C \uB77C\uC6B4\uB4DC\uC5D0\uB294 \uCD5C\uB300 20\uBA85\uAE4C\uC9C0 \uCC38\uC5EC\uD560 \uC218 \uC788\uC5B4\uC694.");
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

    setParticipants((current) => [...current, ...added]);
    setNewName("");
    setGroups([]);
    const skipped = names.length - added.length;
    setMessage(`${added.length}명이 대기실에 입장했어요.${skipped ? ` ${skipped}명은 중복·글자 수·정원 제한으로 제외했어요.` : ""}`);
  }

  function removeParticipant(name: string) {
    if (drawing) return;
    setParticipants((names) => names.filter((participant) => participant !== name));
    setHistory((names) => names.filter((participant) => participant !== name));
    setGroups([]);
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
    setSideView("groups");
    setMessage(`${participants.length}명을 ${count}개 모둠으로 골고루 편성했어요!`);
    [260, 390, 520].forEach((frequency, index) => playTone(frequency, 0.14, index * 0.08, 0.05, "triangle"));
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
          <div className="panel-heading"><h2 id="participants-title">{C.waitingRoom}</h2><span>READY TO PRESENT</span></div>
          <ul className="participant-list">
            {participants.map((name, index) => (
              <li className="participant" key={name}>
                <span className="number">{String(index + 1).padStart(2, "0")}</span><span>{name}</span>
                <button type="button" className="remove-button" onClick={() => removeParticipant(name)} disabled={drawing} aria-label={`${name} ${C.delete}`}>x</button>
              </li>
            ))}
          </ul>
          <form className="add-form" onSubmit={addParticipant}>
            <label htmlFor="new-name">{C.addParticipant}</label>
            <div><textarea id="new-name" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={C.nameInput} maxLength={360} rows={3} disabled={drawing} /><button type="submit" disabled={drawing}>{C.add}</button></div>
            <p>엑셀·명단을 여러 줄로 붙여넣어도 돼요 · 이름당 최대 12자</p>
          </form>
        </section>

        <section className={`stage phase-${phase}`} aria-labelledby="stage-title">
          <div className="on-air"><span aria-hidden="true" />ON AIR</div>
          <div className="screen-shell"><div className="screen" aria-live="assertive" aria-atomic="true"><p id="stage-title">{C.stageTitle}</p><strong className="mystery-name">{display}</strong><span>{phase === "winner" ? C.congratulations : "WHO WILL IT BE?"}</span></div></div>
          <div className="tension-line"><span />READY?<span /></div>
          <div className="buzzer-base"><button type="button" className="draw-button" onClick={startDraw} disabled={drawing || participants.length < 2}>{drawing ? C.drawing : remaining.length === 0 && history.length ? C.newRound : C.start}</button></div>
          <p className="stage-message" role="status">{message}</p>
          <p className="fairness">{C.remaining} <strong>{remaining.length}</strong>{C.people} | {C.fair}</p>
          {phase === "winner" && <div className="confetti" key={burst} aria-hidden="true">{Array.from({ length: 28 }, (_, index) => <i key={index} style={{ left: `${(index * 37) % 100}%`, animationDelay: `${(index % 7) * 45}ms`, backgroundColor: ["#f04f3d", "#164bc5", "#ffd44d", "#fffaf0"][index % 4] }} />)}</div>}
        </section>

        <aside className="panel history-panel" aria-labelledby="side-panel-title">
          <div className="panel-heading red"><h2 id="side-panel-title">{sideView === "history" ? C.history : "랜덤 모둠 편성"}</h2><span>{sideView === "history" ? "HALL OF FAME" : "TEAM MAKER"}</span></div>
          <div className="panel-tabs" role="tablist" aria-label="결과 패널">
            <button type="button" role="tab" aria-selected={sideView === "history"} onClick={() => setSideView("history")}>발표 기록</button>
            <button type="button" role="tab" aria-selected={sideView === "groups"} onClick={() => setSideView("groups")}>모둠 편성</button>
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
            {groups.length ? <div className="group-grid">{groups.map((group, index) => <section className="group-card" key={`${index}-${group.join("-")}`}><h3>{index + 1}모둠 <span>{group.length}명</span></h3><ul>{group.map((name) => <li key={name}>{name}</li>)}</ul></section>)}</div> : <div className="empty-groups"><strong>몇 모둠으로 나눌까요?</strong><span>모둠 수를 고르고 랜덤 편성을 눌러주세요.<br />인원 차이는 최대 1명으로 맞춰드려요.</span></div>}
          </div>}
        </aside>
      </div>
    </main>
  );
}
