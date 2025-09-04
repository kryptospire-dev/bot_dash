import { create } from 'zustand';
import type { User } from '@/lib/types';

interface UserState {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  
  showOnlyWithAddress: boolean;
  setShowOnlyWithAddress: (value: boolean) => void;
  
  showOnlyPendingReferral: boolean;
  setShowOnlyPendingReferral: (value: boolean) => void;

  showOnlyPendingStatus: boolean;
  setShowOnlyPendingStatus: (value: boolean) => void;

  sortBy: string;
  sortDirection: 'asc' | 'desc';
  setSort: (column: string, direction: 'asc' | 'desc') => void;

  selectedUser: User | null;
  setSelectedUser: (user: User | null) => void;

  isDialogOpen: boolean;
  setIsDialogOpen: (isOpen: boolean) => void;

  reset: () => void;
}

const initialState = {
    searchTerm: '',
    showOnlyWithAddress: false,
    showOnlyPendingReferral: false,
    showOnlyPendingStatus: false,
    sortBy: 'joinDate',
    sortDirection: 'desc' as 'asc' | 'desc',
    selectedUser: null,
    isDialogOpen: false,
};

export const useUserStore = create<UserState>()((set) => ({
  ...initialState,
  setSearchTerm: (term) => set({ searchTerm: term }),
  setShowOnlyWithAddress: (value) => set({ showOnlyWithAddress: value }),
  setShowOnlyPendingReferral: (value) => set({ showOnlyPendingReferral: value }),
  setShowOnlyPendingStatus: (value) => set({ showOnlyPendingStatus: value }),
  setSort: (column, direction) => set({ sortBy: column, sortDirection: direction }),
  setSelectedUser: (user) => set({ selectedUser: user }),
  setIsDialogOpen: (isOpen) => set({ isDialogOpen: isOpen }),
  reset: () => set(initialState),
}));
