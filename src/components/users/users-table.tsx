
"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useVirtualizer } from '@tanstack/react-virtual'
import { useInfiniteQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { format } from "date-fns";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/types";
import { Search, UserX, Filter, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import UserProfile from "./user-profile";
import { ScrollArea } from "../ui/scroll-area";
import { useUserStore } from "@/store/user-store";

import { db } from "@/lib/firebase-client";
import { collection, query, orderBy, startAfter, limit, getDocs, where, QueryConstraint, DocumentData, Query } from 'firebase/firestore';

const PAGE_SIZE = 50;

const mapDocToUser = (doc: DocumentData): User => {
    const data = doc.data();
    const rewardInfo = data.reward_info || {};
    const referralStats = data.referral_stats || {};

    return {
        id: doc.id,
        name: data.first_name || 'N/A',
        username: data.username || data.user_id?.toString() || 'N/A',
        joinDate: data.created_at?.toDate ? format(data.created_at.toDate(), 'Pp') : 'N/A',
        created_at: data.created_at,
        lastSeen: data.updated_at?.toDate ? format(data.updated_at.toDate(), 'Pp') : 'N/A',
        bep20_address: data.bep20_address,
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
};

const fetchUsers = async ({ pageParam }: { pageParam: DocumentData | null }) => {
    const {
        showOnlyWithAddress,
        showOnlyPendingReferral,
        showOnlyPendingStatus,
        sortBy,
        sortDirection,
        searchTerm
    } = useUserStore.getState();

    const usersRef = collection(db, 'users');
    let q: Query;
    
    if (searchTerm) {
        const searchConstraints = (field: string) => [
            where(field, '>=', searchTerm),
            where(field, '<=', searchTerm + '\uf8ff')
        ];
        
        const nameQuery = query(usersRef, ...searchConstraints('first_name'));
        const usernameQuery = query(usersRef, ...searchConstraints('username'));
        const addressQuery = query(usersRef, ...searchConstraints('bep20_address'));

        const [nameSnapshot, usernameSnapshot, addressSnapshot] = await Promise.all([
            getDocs(nameQuery),
            getDocs(usernameQuery),
            getDocs(addressQuery),
        ]);
        
        const userMap = new Map<string, User>();
        const processSnapshot = (snapshot: DocumentData) => {
            snapshot.docs.forEach((doc: DocumentData) => {
                if (!userMap.has(doc.id)) {
                    userMap.set(doc.id, mapDocToUser(doc));
                }
            });
        };
        processSnapshot(nameSnapshot);
        processSnapshot(usernameSnapshot);
        processSnapshot(addressSnapshot);

        let searchResults = Array.from(userMap.values());
         if (showOnlyWithAddress) {
            searchResults = searchResults.filter(user => !!user.bep20_address);
        }
        if (showOnlyPendingStatus) {
            searchResults = searchResults.filter(user => user.reward_info?.reward_status === 'pending' && !!user.bep20_address);
        }
        if (showOnlyPendingReferral) {
            searchResults = searchResults.filter(user => {
                const totalReferrals = user.referral_stats?.total_referrals || 0;
                const totalRewards = user.referral_stats?.total_rewards || 0;
                return totalReferrals !== totalRewards;
            });
        }
        return { users: searchResults, lastVisible: null };
    }

    const queryConstraints: QueryConstraint[] = [];
    if (showOnlyWithAddress) queryConstraints.push(where("bep20_address", ">", ""));
    if (showOnlyPendingStatus) {
        queryConstraints.push(where("reward_info.reward_status", "==", "pending"));
        if (!showOnlyWithAddress) queryConstraints.push(where("bep20_address", ">", ""));
    }
    
    let sortField = 'created_at';
    if (sortBy === 'name') sortField = 'first_name';
    if (sortBy === 'mntc_earned') sortField = 'reward_info.mntc_earned';
    queryConstraints.push(orderBy(sortField, sortDirection));

    if (pageParam) {
        queryConstraints.push(startAfter(pageParam));
    }
    queryConstraints.push(limit(PAGE_SIZE));
    
    q = query(usersRef, ...queryConstraints);
    
    const querySnapshot = await getDocs(q);
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    let users = querySnapshot.docs.map(mapDocToUser);

    if (showOnlyPendingReferral) {
        users = users.filter(user => {
            const totalReferrals = user.referral_stats?.total_referrals || 0;
            const totalRewards = user.referral_stats?.total_rewards || 0;
            return totalReferrals !== totalRewards;
        });
    }

    return { users, lastVisible };
};


export default function UsersTable() {
    const {
        searchTerm, setSearchTerm,
        showOnlyWithAddress, setShowOnlyWithAddress,
        showOnlyPendingReferral, setShowOnlyPendingReferral,
        showOnlyPendingStatus, setShowOnlyPendingStatus,
        sortBy, sortDirection, setSort,
        selectedUser, setSelectedUser, isDialogOpen, setIsDialogOpen,
        reset
    } = useUserStore();

    const [localSearch, setLocalSearch] = useState(searchTerm);
    const [debouncedSearch] = useDebounce(localSearch, 150);

    useEffect(() => {
        setSearchTerm(debouncedSearch);
    }, [debouncedSearch, setSearchTerm]);

    const {
        data,
        error,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isFetchingNextPage,
        status,
    } = useInfiniteQuery({
        queryKey: ['users', showOnlyWithAddress, showOnlyPendingReferral, showOnlyPendingStatus, sortBy, sortDirection, searchTerm],
        queryFn: fetchUsers,
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage.lastVisible ?? undefined,
    });
    
    const users = React.useMemo(() => data?.pages.flatMap(page => page.users) ?? [], [data]);

    const tableContainerRef = React.useRef<HTMLDivElement>(null)
    const rowVirtualizer = useVirtualizer({
        count: hasNextPage ? users.length + 1 : users.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 73,
        overscan: 5,
    });

    useEffect(() => {
        const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
        if (!lastItem) return;

        if (
            lastItem.index >= users.length - 1 &&
            hasNextPage &&
            !isFetchingNextPage
        ) {
            fetchNextPage();
        }
    }, [
        hasNextPage,
        fetchNextPage,
        users.length,
        isFetchingNextPage,
        rowVirtualizer.getVirtualItems(),
    ]);

    const handleRowClick = (user: User) => {
        setSelectedUser(user);
        setIsDialogOpen(true);
    };

    const getStatusVariant = (status?: User["reward_info"]['reward_status']) => {
        switch (status) {
            case "paid": return "default";
            case "pending": return "secondary";
            default: return "outline";
        }
    };
    
    const handleSort = (column: string) => {
      const isCurrentSort = sortBy === column;
      setSort(column, isCurrentSort && sortDirection === 'desc' ? 'asc' : 'desc');
    };

    const SortableHeader = ({ column, label }: { column: string; label: string }) => {
        const isSorted = sortBy === column;
        const isDisabled = !!searchTerm;
        return (
            <TableHead
                className={cn("cursor-pointer hover:bg-muted/50", isDisabled && "cursor-not-allowed opacity-50")}
                onClick={() => !isDisabled && handleSort(column)}
            >
                <div className="flex items-center gap-2">
                    {label}
                    {!isDisabled && isSorted && (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />)}
                </div>
            </TableHead>
        );
    };

    const areFiltersActive = showOnlyWithAddress || showOnlyPendingReferral || showOnlyPendingStatus;

    return (
    <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by name, username, or address..."
                    className="w-full max-w-sm pl-10"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                />
            </div>
            
            <Dialog>
                <DialogTrigger asChild><Button variant="outline"><Filter className="mr-2 h-4 w-4" />Filters{areFiltersActive && <span className="ml-2 h-2 w-2 rounded-full bg-primary" />}</Button></DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Filter Users</DialogTitle><DialogDescription>Apply filters to refine the user list.</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex items-center space-x-4 rounded-md border p-4"><div className="flex-1 space-y-1"><p className="text-sm font-medium leading-none">Show only users with BEP20 address</p><p className="text-sm text-muted-foreground">Filter for users who have submitted their wallet address.</p></div><Switch checked={showOnlyWithAddress} onCheckedChange={setShowOnlyWithAddress}/></div>
                        <div className="flex items-center space-x-4 rounded-md border p-4"><div className="flex-1 space-y-1"><p className="text-sm font-medium leading-none">Show only pending referral rewards</p><p className="text-sm text-muted-foreground">Filter for users whose referral rewards haven't been sent.</p></div><Switch checked={showOnlyPendingReferral} onCheckedChange={setShowOnlyPendingReferral}/></div>
                        <div className="flex items-center space-x-4 rounded-md border p-4"><div className="flex-1 space-y-1"><p className="text-sm font-medium leading-none">Show only users with pending status</p><p className="text-sm text-muted-foreground">Filter for users whose reward status is 'pending' and have a wallet address.</p></div><Switch checked={showOnlyPendingStatus} onCheckedChange={setShowOnlyPendingStatus}/></div>
                    </div>
                    <DialogFooter><Button type="button" variant="ghost" onClick={reset}>Clear All</Button><DialogClose asChild><Button type="button">Apply Filters</Button></DialogClose></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

        <div className="rounded-md border">
            <div ref={tableContainerRef} className="h-[600px] overflow-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                            <SortableHeader column="name" label="Name" />
                            <TableHead>BEP20 Address</TableHead>
                            <TableHead className="text-center">Reward Status</TableHead>
                            <SortableHeader column="mntc_earned" label="MNTC Earned" />
                            <TableHead className="text-center">Reward Type</TableHead>
                            <SortableHeader column="joinDate" label="Join Date" />
                        </TableRow>
                    </TableHeader>
                    <TableBody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                        {status === 'pending' ? (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></TableCell></TableRow>
                        ) : status === 'error' ? (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center text-destructive">Error: {error.message}</TableCell></TableRow>
                        ) : rowVirtualizer.getVirtualItems().length > 0 ? (
                            rowVirtualizer.getVirtualItems().map(virtualItem => {
                                const isLoaderRow = virtualItem.index > users.length - 1;
                                const user = users[virtualItem.index];
                                if (isLoaderRow) {
                                    return hasNextPage ? (
                                        <TableRow key="loader" style={{ height: `${virtualItem.size}px`, transform: `translateY(${virtualItem.start}px)` }}><TableCell colSpan={6} className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                    ) : null;
                                }
                                return (
                                    <TableRow
                                        key={user.id}
                                        data-index={virtualItem.index}
                                        ref={node => rowVirtualizer.measureElement(node)}
                                        onClick={() => handleRowClick(user)}
                                        className="cursor-pointer absolute w-full"
                                        style={{ height: `${virtualItem.size}px`, transform: `translateY(${virtualItem.start}px)` }}
                                    >
                                        <TableCell><div className="font-medium">{user.name}</div><div className="text-muted-foreground text-xs">@{user.username}</div></TableCell>
                                        <TableCell className="font-mono text-xs">{user.bep20_address || <span className="text-muted-foreground">N/A</span>}</TableCell>
                                        <TableCell className="text-center"><Badge variant={getStatusVariant(user.reward_info?.reward_status)} className="capitalize">{user.reward_info?.reward_status.replace('_', ' ')}</Badge></TableCell>
                                        <TableCell className="text-center font-medium">{(user.reward_info?.mntc_earned || 0) + ((user.referral_stats?.total_rewards ?? 0) * 2)}</TableCell>
                                        <TableCell className="text-center"><span className={cn("text-xs font-semibold capitalize px-2 py-1 rounded-full", user.reward_info?.reward_type === 'referred' ? 'bg-blue-900/50 text-blue-300' : 'bg-green-900/50 text-green-300')}>{user.reward_info?.reward_type}</span></TableCell>
                                        <TableCell className="text-center text-muted-foreground text-xs">{user.joinDate}</TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center"><div className="flex flex-col items-center justify-center gap-2 text-muted-foreground"><UserX className="h-8 w-8" /><p className="font-medium">No users found.</p>{areFiltersActive || searchTerm ? <p className="text-sm">Try adjusting your search or filters. <button onClick={reset} className="text-primary underline">Clear all</button>.</p> : <p className="text-sm">There are no users to display.</p>}</div></TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-4xl w-full h-[90vh] p-0">
                <ScrollArea className="h-full">
                    {selectedUser && <UserProfile userId={selectedUser.id} />}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    </div>
    );
}
