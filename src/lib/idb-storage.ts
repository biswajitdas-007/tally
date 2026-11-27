import { get, set, del } from "idb-keyval";
import type { StateStorage } from "zustand/middleware";
import { isPreviewSession } from "./preview";

// A dev preview session runs on sample data: it must neither load nor overwrite
// the real cached account in IndexedDB.
export const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (isPreviewSession()) return null;
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (isPreviewSession()) return;
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (isPreviewSession()) return;
    await del(name);
  },
};
