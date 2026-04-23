"use strict";

const assert = require("node:assert/strict");

const { createApp } = require("../app");
const { InMemoryGroupStore } = require("../groupStore");

const createFakePool = () => ({
  async query(sql) {
    if (typeof sql === "string" && sql.includes("SELECT 1")) {
      return { rows: [{ "?column?": 1 }], rowCount: 1 };
    }

    throw new Error(`Unexpected database query in test: ${sql}`);
  },
});

const startTestServer = async () => {
  const app = createApp({
    pool: createFakePool(),
    groupStore: new InMemoryGroupStore(),
    logger: { error: () => undefined },
  });

  const server = await new Promise((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
};

const tests = [
  {
    name: "GET /health returns ok when database connection works",
    run: async () => {
      const server = await startTestServer();
      try {
        const response = await fetch(`${server.baseUrl}/health`);
        const payload = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(payload, { ok: true });
      } finally {
        await server.close();
      }
    },
  },
  {
    name: "group lifecycle persists through create, join, rename and leave",
    run: async () => {
      const server = await startTestServer();
      try {
        const createResponse = await fetch(`${server.baseUrl}/groups/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "owner-1", displayName: "Ala" }),
        });
        const createdGroup = await createResponse.json();

        assert.equal(createResponse.status, 201);
        assert.equal(createdGroup.ownerId, "owner-1");
        assert.equal(createdGroup.members.length, 1);

        const joinResponse = await fetch(`${server.baseUrl}/groups/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: createdGroup.code, userId: "user-2", displayName: "Bartek" }),
        });
        const joinedGroup = await joinResponse.json();

        assert.equal(joinResponse.status, 200);
        assert.equal(joinedGroup.members.length, 2);

        const renameResponse = await fetch(`${server.baseUrl}/groups/rename`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: createdGroup.code, userId: "owner-1", name: "Ekipa testowa" }),
        });
        const renamedGroup = await renameResponse.json();

        assert.equal(renameResponse.status, 200);
        assert.equal(renamedGroup.name, "Ekipa testowa");

        const listResponse = await fetch(`${server.baseUrl}/groups?userId=user-2`);
        const myGroups = await listResponse.json();

        assert.equal(listResponse.status, 200);
        assert.equal(myGroups.length, 1);
        assert.equal(myGroups[0].code, createdGroup.code);

        const leaveResponse = await fetch(`${server.baseUrl}/groups/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: createdGroup.code, userId: "owner-1" }),
        });
        const afterLeave = await leaveResponse.json();

        assert.equal(leaveResponse.status, 200);
        assert.equal(afterLeave.ownerId, "user-2");
        assert.equal(afterLeave.members.length, 1);
        assert.equal(afterLeave.members[0].userId, "user-2");
      } finally {
        await server.close();
      }
    },
  },
  {
    name: "POST /groups/rename rejects non-owner requests",
    run: async () => {
      const server = await startTestServer();
      try {
        const createResponse = await fetch(`${server.baseUrl}/groups/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "owner-1", displayName: "Ala" }),
        });
        const createdGroup = await createResponse.json();

        await fetch(`${server.baseUrl}/groups/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: createdGroup.code, userId: "user-2", displayName: "Bartek" }),
        });

        const renameResponse = await fetch(`${server.baseUrl}/groups/rename`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: createdGroup.code, userId: "user-2", name: "Nie moje" }),
        });
        const payload = await renameResponse.json();

        assert.equal(renameResponse.status, 403);
        assert.equal(payload.error, "Tylko zalozyciel grupy moze zmienic jej nazwe.");
      } finally {
        await server.close();
      }
    },
  },
  {
    name: "removed member can no longer fetch active group details",
    run: async () => {
      const server = await startTestServer();
      try {
        const createResponse = await fetch(`${server.baseUrl}/groups/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "owner-1", displayName: "Ala" }),
        });
        const createdGroup = await createResponse.json();

        await fetch(`${server.baseUrl}/groups/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: createdGroup.code, userId: "user-2", displayName: "Bartek" }),
        });

        const removeResponse = await fetch(`${server.baseUrl}/groups/remove-member`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: createdGroup.code, userId: "owner-1", memberUserId: "user-2" }),
        });

        assert.equal(removeResponse.status, 200);

        const groupResponse = await fetch(`${server.baseUrl}/groups/${createdGroup.code}?userId=user-2`);
        const payload = await groupResponse.json();

        assert.equal(groupResponse.status, 404);
        assert.equal(payload.error, "Nie znaleziono grupy.");
      } finally {
        await server.close();
      }
    },
  },
  {
    name: "POST /spots/reviews validates rating before touching database",
    run: async () => {
      const server = await startTestServer();
      try {
        const response = await fetch(`${server.baseUrl}/spots/reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: 50, lon: 20, rating: 7, comment: "x" }),
        });
        const payload = await response.json();

        assert.equal(response.status, 400);
        assert.equal(payload.error, "Ocena musi byc liczba od 1 do 5.");
      } finally {
        await server.close();
      }
    },
  },
];

let failures = 0;

(async () => {
  for (const testCase of tests) {
    try {
      await testCase.run();
      console.log(`PASS ${testCase.name}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${testCase.name}`);
      console.error(error);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
  } else {
    console.log(`\nAll backend tests passed: ${tests.length}`);
  }
})();
