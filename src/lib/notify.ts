import { collections, membersToNotify, pushSubsFor } from "./db";
import { notifyUsers } from "./pusher-server";
import { sendPush, type PushPayload } from "./webpush";

/**
 * Fan out a change to everyone affected: a realtime "sync" nudge (so open apps
 * refetch) plus a Web Push notification (so locked phones get alerted).
 */
export async function notifyChange(
  memberUids: string[],
  actorUid: string,
  push?: PushPayload,
  socketId?: string,
): Promise<void> {
  const targets = membersToNotify(memberUids, actorUid);
  if (targets.length === 0) return;

  await notifyUsers(targets, {}, socketId);

  if (push) {
    const { users } = await collections();
    const grouped = await pushSubsFor(users, targets);
    const dead: string[] = [];
    for (const { subs } of grouped) dead.push(...(await sendPush(subs, push)));
    if (dead.length) {
      await users.updateMany(
        { "pushSubs.endpoint": { $in: dead } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { $pull: { pushSubs: { endpoint: { $in: dead } } } } as any,
      );
    }
  }
}
