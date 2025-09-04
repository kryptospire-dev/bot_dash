// src/components/users/final-optimized-users-table.tsx
"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from 'next/navigation';
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/types";
import { Search, UserX, Loader2, Filter, ArrowUp, ArrowDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useOptimizedUsers } from "@/hooks/use-optimized-users";

export default function FinalOptimizedUsersTable() {
    const {
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
    } = useOptimizedUsers();

    const [dialogFilters, setDialogFilters] = useState(filters);
    const router = useRouter();
    const observer = useRef<IntersectionObserver>();

    // Sync dialog filters with actual filters
    useEffect(() => {
        setDialogFilters(filters);
    }, [filters]);

    // Intersection observer for infinite scroll
    const lastUserElementRef = useCallback((node: HTMLTableRowElement | null) => {
        if (loadingMore || loading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
                loadMore();
            }
        }, {
            threshold: 0.1,
            rootMargin: '200px'
        });

        if (node) observer.current.observe(node);
    }, [loadingMore, hasMore, loading, loadMore]);

    const getStatusVariant = useCallback((status?: User["reward_info"]['reward_status']) => {
        switch (status) {
            case "paid": return "default";
            case "pending": return "secondary";
            default: return "outline";
        }
    }, []);

    const handleApplyFilters = useCallback(() => {
        setFilters(dialogFilters);
    }, [dialogFilters, setFilters]);

    const handleClearFilters = useCallback(() => {
        clearFilters();
        setDialogFilters({
            showOnlyWithAddress: false,
            showOnlyPendingReferral: false,
            showOnlyPendingStatus: false,
            searchTerm: ''
        });
    }, [clearFilters]);

    const handleSort = useCallback((column: string) => {
        setSort(prevSort => ({
            sortBy: column,
            sortDirection: prevSort.sortBy === column && prevSort.sortDirection === 'asc' ? 'desc' : 'asc'
        }));
    }, [setSort]);

    const areFiltersActive = useMemo(() =>
            filters.showOnlyWithAddress || filters.showOnlyPendingReferral || filters.showOnlyPendingStatus,
        [filters]
    );

    const SortableHeader = ({ column, label }: { column: string; label: string }) => (
        <TableHead
            className="cursor-pointer hover:bg-muted/50 select-none transition-colors"
            onClick={() => handleSort(column)}
        >
            <div className="flex items-center gap-2">
                <span>{label}</span>
                {sort.sortBy === column && (
                    <div className="text-primary">
                        {sort.sortDirection === 'asc' ?
                            <ArrowUp className="h-4 w-4" /> :
                            <ArrowDown className="h-4 w-4" />
                        }
                    </div>
                )}
            </div>
        </TableHead>
    );

    // Memoized table rows for performance
    const tableRows = useMemo(() => {
        return users.map((user, index) => (
            <TableRow
                ref={index === users.length - 1 ? lastUserElementRef : null}
                key={user.id}
                onClick={() => router.push(`/users/${user.id}`)}
                className="cursor-pointer hover:bg-muted/50 transition-colors duration-150"
            >
                <TableCell>
                    <div className="flex items-center gap-3">
                        <div className="min-w-0">
                            <div className="font-medium truncate">{user.name}</div>
                            <div className="text-muted-foreground text-xs truncate">@{user.username}</div>
                        </div>
                    </div>
                </TableCell>
                <TableCell className="font-mono text-xs">
                    {user.bep20_address ? (
                        <div className="max-w-32">
                            <div className="truncate" title={user.bep20_address}>
                                {user.bep20_address}
                            </div>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">N/A</span>
                    )}
                </TableCell>
                <TableCell className="text-center">
                    <Badge
                        variant={getStatusVariant(user.reward_info?.reward_status)}
                        className="capitalize whitespace-nowrap"
                    >
                        {user.reward_info?.reward_status?.replace('_', ' ') || 'not completed'}
                    </Badge>
                </TableCell>
                <TableCell className="text-center font-medium tabular-nums">
                    {(user.reward_info?.mntc_earned || 0) + ((user.referral_stats?.total_rewards ?? 0) * 2)}
                </TableCell>
                <TableCell className="text-center">
          <span className={cn(
              "text-xs font-semibold capitalize px-2 py-1 rounded-full whitespace-nowrap",
              user.reward_info?.reward_type === 'referred'
                  ? 'bg-blue-900/50 text-blue-300'
                  : 'bg-green-900/50 text-green-300'
          )}>
            {user.reward_info?.reward_type || 'normal'}
          </span>
                </TableCell>
                <TableCell className="text-center text-muted-foreground text-xs tabular-nums">
                    {user.joinDate}
                </TableCell>
            </TableRow>
        ));
    }, [users, lastUserElementRef, router, getStatusVariant]);

    return (
        <div className="space-y-4">
            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                        <span>Error loading users: {error}</span>
                        <Button variant="outline" size="sm" onClick={refresh}>
                            Retry
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Search and Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by name, username, ID, or address..."
                        className="pl-10"
                        value={filters.searchTerm}
                        onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    />
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="shrink-0">
                            <Filter className="mr-2 h-4 w-4" />
                            Filters
                            {areFiltersActive && (
                                <span className="ml-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
                            )}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Filter Users</DialogTitle>
                            <DialogDescription>
                                Apply filters to refine the user list for better management.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="flex items-center space-x-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        Show only users with BEP20 address
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Filter for users who have submitted their wallet address.
                                    </p>
                                </div>
                                <Switch
                                    checked={dialogFilters.showOnlyWithAddress}
                                    onCheckedChange={(checked) =>
                                        setDialogFilters(prev => ({ ...prev, showOnlyWithAddress: checked }))
                                    }
                                />
                            </div>

                            <div className="flex items-center space-x-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        Show only pending referral rewards
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Filter for users whose referral rewards haven't been sent.
                                    </p>
                                </div>
                                <Switch
                                    checked={dialogFilters.showOnlyPendingReferral}
                                    onCheckedChange={(checked) =>
                                        setDialogFilters(prev => ({ ...prev, showOnlyPendingReferral: checked }))
                                    }
                                />
                            </div>

                            <div className="flex items-center space-x-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        Show only users with pending status
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Filter for users whose reward status is 'pending' and have a wallet address.
                                    </p>
                                </div>
                                <Switch
                                    checked={dialogFilters.showOnlyPendingStatus}
                                    onCheckedChange={(checked) =>
                                        setDialogFilters(prev => ({ ...prev, showOnlyPendingStatus: checked }))
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button type="button" variant="ghost" onClick={handleClearFilters}>
                                Clear All Filters
                            </Button>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">Cancel</Button>
                            </DialogClose>
                            <DialogClose asChild>
                                <Button type="button" onClick={handleApplyFilters}>Apply Filters</Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Users Table */}
            <div className="rounded-lg border bg-card shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <SortableHeader column="name" label="Name" />
                            <TableHead>BEP20 Address</TableHead>
                            <TableHead className="text-center">Reward Status</TableHead>
                            <SortableHeader column="mntc_earned" label="MNTC Earned" />
                            <TableHead className="text-center">Reward Type</TableHead>
                            <SortableHeader column="created_at" label="Join Date" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* Loading Skeleton */}
                        {loading && (
                            Array.from({ length: 10 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-32" />
                                                <Skeleton className="h-3 w-24" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                    <TableCell className="text-center"><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                                    <TableCell className="text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                                    <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                                    <TableCell className="text-center"><Skeleton className="h-4 w-28 mx-auto" /></TableCell>
                                </TableRow>
                            ))
                        )}

                        {/* User Rows */}
                        {!loading && tableRows}

                        {/* Empty State */}
                        {!loading && users.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                        <UserX className="h-12 w-12 opacity-50" />
                                        <div className="space-y-1">
                                            <p className="font-medium">No users found</p>
                                            {areFiltersActive || filters.searchTerm ? (
                                                <p className="text-sm">
                                                    Try adjusting your search or filters, or{' '}
                                                    <button
                                                        onClick={handleClearFilters}
                                                        className="text-primary underline hover:no-underline"
                                                    >
                                                        clear all filters
                                                    </button>
                                                    .
                                                </p>
                                            ) : (
                                                <p className="text-sm">No users have been registered yet.</p>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}

                        {/* Loading More Indicator */}
                        {loadingMore && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center">
                                    <div className="flex justify-center items-center py-6">
                                        <Loader2 className="h-5 w-5 animate-spin text-primary mr-3" />
                                        <span className="text-sm text-muted-foreground">Loading more users...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}

                        {/* End of Results */}
                        {!hasMore && users.length > 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                                    <div className="flex items-center justify-center gap-2 text-sm">
                                        <div className="h-1 w-1 rounded-full bg-muted-foreground/50"></div>
                                        <span>You've reached the end of the list ({users.length} users)</span>
                                        <div className="h-1 w-1 rounded-full bg-muted-foreground/50"></div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}