import assert from "node:assert/strict";
import test from "node:test";

import {
  createNumberedParticipants,
  createBalancedGroups,
  createGroupsCsv,
  moveGroupMember,
  parseParticipantNames,
  parseGroupsCsv,
  parseStoredClasses,
  pickUnselectedMember,
} from "../app/participant-utils.ts";

test("붙여넣은 참가자를 여러 구분자로 나눈다", () => {
  assert.deepEqual(parseParticipantNames("민서\n준호, 서윤\t김 지우; 현우"), [
    "민서",
    "준호",
    "서윤",
    "김 지우",
    "현우",
  ]);
});

test("모둠 인원 차이가 한 명을 넘지 않는다", () => {
  const participants = ["1", "2", "3", "4", "5", "6", "7"];
  const groups = createBalancedGroups(participants, 3, () => 0.5);
  assert.deepEqual(groups.map((group) => group.length), [3, 2, 2]);
  assert.deepEqual(groups.flat().sort(), participants);
});

test("모둠 안에서 모두 뽑기 전까지 중복을 피한다", () => {
  const members = ["민서", "준호", "서윤"];
  assert.equal(pickUnselectedMember(members, ["민서"], () => 0), "준호");
  assert.equal(pickUnselectedMember(members, members, () => 0), "민서");
});

test("학생 수만큼 번호 명단을 최대 1000명까지 만든다", () => {
  assert.deepEqual(createNumberedParticipants(3), ["1", "2", "3"]);
  assert.equal(createNumberedParticipants(1001).length, 1000);
  assert.deepEqual(createNumberedParticipants(-1), []);
});

test("저장된 반 명단에서 잘못된 데이터와 중복을 제거한다", () => {
  const stored = JSON.stringify([
    { id: "class-1", name: " 1반 ", participants: ["민서", "민서", "", 3] },
    { id: "class-1", name: "중복 ID", participants: ["준호"] },
    { nope: true },
  ]);
  assert.deepEqual(parseStoredClasses(stored), [
    { id: "class-1", name: "1반", participants: ["민서"], groups: [], groupPicks: {} },
  ]);
  assert.deepEqual(parseStoredClasses("잘못된 JSON"), []);
});

test("저장된 반 데이터에서 모둠과 발표 순서를 복원한다", () => {
  const stored = JSON.stringify([{
    id: "class-1",
    name: "1반",
    participants: ["민서", "준호"],
    groups: [["민서"], ["준호"]],
    groupPicks: { 0: ["민서"], 1: ["없는 학생"] },
  }]);
  assert.deepEqual(parseStoredClasses(stored)[0], {
    id: "class-1",
    name: "1반",
    participants: ["민서", "준호"],
    groups: [["민서"], ["준호"]],
    groupPicks: { 0: ["민서"], 1: [] },
  });
});

test("모둠 CSV를 저장하고 같은 명단으로 다시 불러온다", () => {
  const groups = [["민서", "김,지우"], ["준호"]];
  const csv = createGroupsCsv(groups);
  assert.equal(csv, '모둠,학생\r\n1,민서\r\n1,"김,지우"\r\n2,준호');
  assert.deepEqual(parseGroupsCsv(csv, ["민서", "김,지우", "준호"]), groups);
  assert.throws(() => parseGroupsCsv("모둠,학생\n1,민서\n2,없는학생", ["민서", "준호"]), /현재 반 명단/);
});

test("학생을 다른 모둠으로 이동한다", () => {
  const groups = [["민서", "준호"], ["서윤"]];
  assert.deepEqual(moveGroupMember(groups, "준호", 0, 1), [["민서"], ["서윤", "준호"]]);
  assert.equal(moveGroupMember(groups, "없는 학생", 0, 1), groups);
});
