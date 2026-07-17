import assert from "node:assert/strict";
import test from "node:test";

import { createBalancedGroups, parseParticipantNames } from "../app/participant-utils.ts";

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
