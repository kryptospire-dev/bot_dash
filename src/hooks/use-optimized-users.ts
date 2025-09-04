// src/hooks/use-optimized-users.ts
"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase-client';
import {
    collection,
    getDocs,
    query,
    DocumentData,
    where,
    limit,
    startAfter,
    orderBy,
    QueryConstraint,
    QueryDocumentSnapshot
} from 'firebase/firestore';
import { format } from 'date-fns';
import type { User } from '@/lib/types';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

interface FilterState {
    showOnlyWithAddress: boolean;
    showOnlyPendingReferral: boolean;
    showOnlyPendingStatus: boolean;
    searchTerm: string;
}

interface SortState {
    sortBy: string;
    sortDirection: 'asc' | 'desc';
}

interface UseOptimizedUsersReturn {
    users: User[];
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    error: string | null;
    filters: FilterState;
    sort: SortState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    setSort: React.Dispatch<React.SetStateAction<SortState>>;
    loadMore: () => void;
    refresh: () => void;
    clearFilters: () => void;
}

export function useOptimizedUsers(): UseOptimizedUsersReturn {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

    const [filters, setFilters] = useState<FilterState>({
        showOnlyWithAddress: false,
        showOnlyPendingReferral: false,
        showOnlyPendingStatus: false,
        searchTerm: ""
    });

    const [sort, setSort] = useState<SortState>({
        sortBy: 'created_at',
        sortDirection: 'desc'
    });

    const searchTimeoutRef = useRef<NodeJS.Timeout>();
    const abortControllerRef = useRef<AbortController>();

    // Debounce search term
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedSearchTerm(filters.searchTerm);
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [filters.searchTerm]);

    // Optimized document to user mapper
    const mapDocToUser = useCallback((doc: QueryDocumentSnapshot<DocumentData>): User => {
        const userData = doc.data();
        const rewardInfo = userData.reward_info || {};
        const referralStats = userData.referral_stats || {};

        return {
            id: doc.id,
            name: userData.first_name || 'N/A',
            username: userData.username || userData.user_id?.toString() || 'N/A',
            joinDate: userData.created_at?.toDate ? format(userData.created_at.toDate(), 'Pp') : 'N/A',
            created_at: userData.created_at,
            lastSeen: userData.updated_at?.toDate ? format(userData.updated_at.toDate(), 'Pp') : 'N/A',
            bep20_address: userData.bep20_address || undefined,
            reward_info: {
                mntc_earned: rewardInfo.mntc_earned || 0,
                reward_status: rewardInfo.reward_status || 'not_completed',
                reward_type: rewardInfo.reward_type || 'normal',
                completion_date: rewardInfo.completion_date?.toDate ? format(rewardInfo.completion_date.toDate(), 'Pp') : 'N/A',
            },
            referral_stats: {
                total_referrals: referralStats.total_referrals || 0,
                total_rewards: referralStats.total_rewards || 0,
            },
        };
    }, []);

    // Build optimized Firestore query
    const buildQuery = useCallback((cursor: QueryDocumentSnapshot<DocumentData> | null = null) => {
        const usersRef = collection(db, 'users');
        const queryConstraints: QueryConstraint[] = [];

        // Server-side filters
        if (filters.showOnlyWithAddress) {
            queryConstraints.push(where("bep20_address", "!=", ""));
        }

        if (filters.showOnlyPendingStatus) {
            queryConstraints.push(where("reward_info.reward_status", "==", "pending"));
            // Ensure we also have address if not already filtered
            if (!filters.showOnlyWithAddress) {
                queryConstraints.push(where("bep20_address", "!=", ""));
            }
        }

        // Sorting
        let sortField = 'created_at';
        if (sort.sortBy === 'name') sortField = 'first_name';
        if (sort.sortBy === 'mntc_earned') sortField = 'reward_info.mntc_earned';

        queryConstraints.push(orderBy(sortField, sort.sortDirection));

        // Pagination
        if (cursor) {
            queryConstraints.push(startAfter(cursor));
        }

        queryConstraints.push(limit(PAGE_SIZE));

        return query(usersRef, ...queryConstraints);
    }, [filters.showOnlyWithAddress, filters.showOnlyPendingStatus, sort.sortBy, sort.sortDirection]);

    // Apply client-side filters that can't be done server-side
    const applyClientSideFilters = useCallback((userList: User[]): User[] => {
        let filteredUsers = userList;

        // Search filtering
        if (debouncedSearchTerm.trim()) {
            const searchLower = debouncedSearchTerm.toLowerCase();
            filteredUsers = filteredUsers.filter(user =>
                user.name.toLowerCase().includes(searchLower) ||
                user.username.toLowerCase().includes(searchLower) ||
                user.id.toLowerCase().includes(searchLower) ||
                (user.bep20_address && user.bep20_address.toLowerCase().includes(searchLower))
            );
        }

        // Referral filtering (requires client-side logic)
        if (filters.showOnlyPendingReferral) {
            filteredUsers = filteredUsers.filter(user => {
                const totalReferrals = user.referral_stats?.total_referrals || 0;
                const totalRewards = user.referral_stats?.total_rewards || 0;
                return totalReferrals > totalRewards;
            });
        }

        return filteredUsers;
    }, [debouncedSearchTerm, filters.showOnlyPendingReferral]);

    // Fetch users with improved error handling and performance
    const fetchUsers = useCallback(async (isNewQuery = false) => {
        // Prevent multiple simultaneous requests
        if (loadingMore && !isNewQuery) return;

        // Cancel previous request if still running
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const loadingState = isNewQuery ? setLoading : setLoadingMore;
        loadingState(true);
        setError(null);

        try {
            const q = buildQuery(isNewQuery ? null : lastVisible);
            const documentSnapshots = await getDocs(q);

            if (abortControllerRef.current.signal.aborted) return;

            const newUsers = documentSnapshots.docs.map(mapDocToUser);
            const filteredUsers = applyClientSideFilters(newUsers);

            const lastDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
            setLastVisible(lastDoc || null);
            setHasMore(documentSnapshots.docs.length === PAGE_SIZE);

            if (isNewQuery) {
                setUsers(filteredUsers);
            } else {
                setUsers(prevUsers => {
                    // Prevent duplicates
                    const existingIds = new Set(prevUsers.map(u => u.id));
                    const uniqueNewUsers = filteredUsers.filter(u => !existingIds.has(u.id));
                    return [...prevUsers, ...uniqueNewUsers];
                });
            }
        } catch (err) {
            if (!abortControllerRef.current?.signal.aborted) {
                console.error("Error fetching users:", err);
                setError(err instanceof Error ? err.message : 'Failed to fetch users');
                setHasMore(false);
            }
        } finally {
            if (!abortControllerRef.current?.signal.aborted) {
                loadingState(false);
            }
        }
    }, [buildQuery, lastVisible, loadingMore, mapDocToUser, applyClientSideFilters]);

    // Load more users for infinite scroll
    const loadMore = useCallback(() => {
        if (!loadingMore && hasMore && !loading) {
            fetchUsers(false);
        }
    }, [fetchUsers, loadingMore, hasMore, loading]);

    // Refresh users list
    const refresh = useCallback(() => {
        setUsers([]);
        setLastVisible(null);
        setHasMore(true);
        setError(null);
        fetchUsers(true);
    }, [fetchUsers]);

    // Clear all filters
    const clearFilters = useCallback(() => {
        setFilters({
            showOnlyWithAddress: false,
            showOnlyPendingReferral: false,
            showOnlyPendingStatus: false,
            searchTerm: ''
        });
    }, []);

    // Reset and refetch when filters or sort change
    useEffect(() => {
        refresh();
    }, [
        debouncedSearchTerm,
        filters.showOnlyWithAddress,
        filters.showOnlyPendingStatus,
        sort.sortBy,
        sort.sortDirection
    ]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Memoized return value to prevent unnecessary re-renders
    return useMemo(() => ({
        users,
        loading,
        loadingMore,
        hasMore,
        error,
        filters,
        sort,
        setFilters,
        setSort,
        loadMore,
        refresh,
        clearFilters
    }), [
        users,
        loading,
        loadingMore,
        hasMore,
        error,
        filters,
        sort,
        loadMore,
        refresh,
        clearFilters
    ]);
}