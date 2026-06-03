import { create } from "zustand";
import { mockUsers } from "../lib/mockData";
import type { User, UserRole } from "../lib/types";

interface UserState {
  currentUser: User;
  setUsername: (username: string) => void;
  setRole: (role: UserRole) => void;
}

export const useUserStore = create<UserState>((set) => ({
  currentUser: mockUsers[0],
  setUsername: (username) => set((state) => ({ currentUser: { ...state.currentUser, username } })),
  setRole: (role) => set((state) => ({ currentUser: { ...state.currentUser, role } }))
}));
