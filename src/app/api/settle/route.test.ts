import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyUser: vi.fn(),
  knownUids: vi.fn(),
  usersFind: vi.fn(),
  groupFindOne: vi.fn(),
  expenseUpdateOne: vi.fn(),
}));

vi.mock("@/lib/auth-server", () => ({ verifyUser: mocks.verifyUser }));
vi.mock("@/lib/notify", () => ({ notifyChange: vi.fn() }));
vi.mock("@/lib/settlement-email", () => ({ sendSettlementEmail: vi.fn(async () => false) }));
vi.mock("@/lib/settled-email", () => ({ sendSettledEmail: vi.fn(async () => false) }));
vi.mock("@/lib/db", () => ({
  knownUids: mocks.knownUids,
  collections: async () => ({
    expenses: { updateOne: mocks.expenseUpdateOne },
    users: { find: mocks.usersFind, findOne: vi.fn(async () => null) },
    groups: { findOne: mocks.groupFindOne },
  }),
}));

import { POST } from "./route";

const settle = (body: Record<string, unknown>) =>
  POST(new Request("https://tally.test/api/settle", { method: "POST", body: JSON.stringify({ id: "s1", amount: 500, ...body }) }));

describe("POST /api/settle", () => {
  beforeEach(() => {
    mocks.verifyUser.mockReset().mockResolvedValue({ uid: "me", name: "Me" });
    mocks.knownUids.mockReset().mockResolvedValue(new Set(["me", "friend"]));
    mocks.usersFind.mockReset().mockImplementation((q: { _id: { $in: string[] } }) => ({
      toArray: async () => q._id.$in.filter((id) => id !== "placeholder").map((_id) => ({ _id })),
    }));
    mocks.groupFindOne.mockReset();
    mocks.expenseUpdateOne.mockReset().mockResolvedValue({});
  });

  it("refuses a direct settlement with a stranger", async () => {
    expect((await settle({ from: "me", to: "stranger" })).status).toBe(403);
    expect(mocks.expenseUpdateOne).not.toHaveBeenCalled();
  });

  it("records a direct settlement with someone in your circle", async () => {
    expect((await settle({ from: "me", to: "friend" })).status).toBe(200);
    expect(mocks.expenseUpdateOne.mock.calls[0][1].$setOnInsert).toMatchObject({ memberUids: ["me", "friend"], isSettlement: true });
  });

  it("refuses a group settlement with someone outside the group", async () => {
    mocks.groupFindOne.mockResolvedValue({ _id: "g1", name: "Goa", members: [{ id: "me" }, { id: "friend" }], memberUids: ["me", "friend"] });
    expect((await settle({ from: "me", to: "outsider", groupId: "g1" })).status).toBe(403);
    expect((await settle({ from: "me", to: "friend", groupId: "g1" })).status).toBe(200);
  });
});
