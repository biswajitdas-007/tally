import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyUser: vi.fn(),
  inviteFindOne: vi.fn(),
  groupFindOne: vi.fn(),
  groupUpdateOne: vi.fn(),
  inviteUpdateOne: vi.fn(),
}));

vi.mock("@/lib/auth-server", () => ({ verifyUser: mocks.verifyUser }));
vi.mock("@/lib/notify", () => ({ notifyChange: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendWelcomeEmail: vi.fn() }));
vi.mock("@/lib/db", () => ({
  addContact: vi.fn(),
  upsertUser: vi.fn(async () => ({ doc: { _id: "joiner", name: "Joiner" }, isNew: false })),
  collections: async () => ({
    invites: { findOne: mocks.inviteFindOne, updateOne: mocks.inviteUpdateOne },
    groups: { findOne: mocks.groupFindOne, updateOne: mocks.groupUpdateOne },
    expenses: { updateMany: vi.fn() },
    users: { findOne: vi.fn(async () => null) },
  }),
}));

import { POST } from "./route";

const accept = (id = "i1") =>
  POST(new Request(`https://tally.test/api/invite/${id}/accept`, { method: "POST" }), { params: Promise.resolve({ id }) });

describe("POST /api/invite/[id]/accept", () => {
  beforeEach(() => {
    mocks.verifyUser.mockReset().mockResolvedValue({ uid: "joiner", name: "Joiner" });
    mocks.inviteFindOne.mockReset();
    mocks.groupFindOne.mockReset().mockResolvedValue({ _id: "g1", name: "Goa", members: [], memberUids: ["inviter"] });
    mocks.groupUpdateOne.mockReset();
    mocks.inviteUpdateOne.mockReset();
  });

  it("lets a personal invite be used only once", async () => {
    mocks.inviteFindOne.mockResolvedValue({ _id: "i1", inviterUid: "inviter", groupId: "g1", status: "accepted", acceptedByUid: "first" });
    expect((await accept()).status).toBe(410);
    expect(mocks.groupUpdateOne).not.toHaveBeenCalled();
  });

  it("joins the group through a valid invite", async () => {
    mocks.inviteFindOne.mockResolvedValue({ _id: "i1", inviterUid: "inviter", groupId: "g1", status: "pending" });
    const res = await accept();
    expect(await res.json()).toEqual({ ok: true, groupId: "g1" });
    expect(mocks.groupUpdateOne).toHaveBeenCalledTimes(1);
  });

  it("doesn't open a group the inviter has since left", async () => {
    mocks.inviteFindOne.mockResolvedValue({ _id: "i1", inviterUid: "inviter", groupId: "g1", status: "pending" });
    mocks.groupFindOne.mockResolvedValue({ _id: "g1", name: "Goa", members: [], memberUids: ["someone-else"] });
    const res = await accept();
    expect(await res.json()).toEqual({ ok: true, groupId: null });
    expect(mocks.groupUpdateOne).not.toHaveBeenCalled();
  });
});
