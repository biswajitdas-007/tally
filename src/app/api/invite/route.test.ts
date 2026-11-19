import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyUser: vi.fn(),
  groupsFindOne: vi.fn(),
  invitesFindOne: vi.fn(),
  invitesUpdateOne: vi.fn(),
}));

vi.mock("@/lib/auth-server", () => ({ verifyUser: mocks.verifyUser }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn(async () => false) }));
vi.mock("@/lib/mongodb", () => ({
  isDbConfigured: true,
  getDb: async () => ({
    collection: (name: string) =>
      name === "groups"
        ? { findOne: mocks.groupsFindOne }
        : name === "invites"
          ? { findOne: mocks.invitesFindOne, updateOne: mocks.invitesUpdateOne }
          : { findOne: vi.fn(async () => null) },
  }),
}));

import { POST } from "./route";

const post = (body: Record<string, unknown>) =>
  POST(new Request("https://tally.test/api/invite", { method: "POST", body: JSON.stringify(body) }));

describe("POST /api/invite", () => {
  beforeEach(() => {
    mocks.verifyUser.mockReset().mockResolvedValue({ uid: "me", name: "Me" });
    mocks.groupsFindOne.mockReset().mockResolvedValue({ _id: "g1" });
    mocks.invitesFindOne.mockReset().mockResolvedValue(null);
    mocks.invitesUpdateOne.mockReset().mockResolvedValue({});
  });

  it("refuses to invite people into a group the caller isn't in", async () => {
    mocks.groupsFindOne.mockResolvedValueOnce(null);
    const res = await post({ inviteId: "i1", isGeneric: true, groupId: "someone-elses" });
    expect(res.status).toBe(403);
    expect(mocks.invitesUpdateOne).not.toHaveBeenCalled();
  });

  it("refuses to rewrite someone else's invite", async () => {
    mocks.invitesFindOne.mockResolvedValueOnce({ _id: "i1", inviterUid: "other" });
    const res = await post({ inviteId: "i1", isGeneric: true });
    expect(res.status).toBe(403);
    expect(mocks.invitesUpdateOne).not.toHaveBeenCalled();
  });

  it("lets the inviter save their own invite", async () => {
    mocks.invitesFindOne.mockResolvedValueOnce({ _id: "i1", inviterUid: "me" });
    const res = await post({ inviteId: "i1", isGeneric: true, groupId: "g1" });
    expect(res.status).toBe(200);
    expect(mocks.invitesUpdateOne).toHaveBeenCalledTimes(1);
  });
});
