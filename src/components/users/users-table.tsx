
"use client";

import { useState, useCallback, useRef } from "react";
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
import { Search, UserX, Loader2, Filter, ArrowUp, ArrowDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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


interface UsersTableProps {
    users: User[];
    fetchUsers: () => void;
    hasMore: boolean;
    loading: boolean;
    loadingMore: boolean;
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
    handleSort: (column: string) => void;
}

export default function UsersTable({ 
    users, 
    fetchUsers, 
    hasMore, 
    loading,
    loadingMore,
    searchTerm,
    setSearchTerm,
    showOnlyWithAddress,
    setShowOnlyWithAddress,
    showOnlyPendingReferral,
    setShowOnlyPendingReferral,
    showOnlyPendingStatus,
    setShowOnlyPendingStatus,
    sortBy,
    sortDirection,
    handleSort,
}: UsersTableProps) {
  const router = useRouter();
  const observer = useRef<IntersectionObserver>();
  
  const [dialogAddressFilter, setDialogAddressFilter] = useState(showOnlyWithAddress);
  const [dialogReferralFilter, setDialogReferralFilter] = useState(showOnlyPendingReferral);
  const [dialogPendingStatusFilter, setDialogPendingStatusFilter] = useState(showOnlyPendingStatus);

  const lastUserElementRef = useCallback((node: HTMLTableRowElement) => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchUsers();
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore, fetchUsers]);

  const getStatusVariant = (status?: User["reward_info"]['reward_status']) => {
    switch (status) {
      case "paid":
        return "default";
      case "pending":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleApplyFilters = () => {
    setShowOnlyWithAddress(dialogAddressFilter);
    setShowOnlyPendingReferral(dialogReferralFilter);
    setShowOnlyPendingStatus(dialogPendingStatusFilter);
  };
  
  const clearFilters = () => {
    setSearchTerm('');
    setShowOnlyWithAddress(false);
    setShowOnlyPendingReferral(false);
    setShowOnlyPendingStatus(false);
    setDialogAddressFilter(false);
    setDialogReferralFilter(false);
    setDialogPendingStatusFilter(false);
  }

  const areFiltersActive = showOnlyWithAddress || showOnlyPendingReferral || showOnlyPendingStatus;

  const SortableHeader = ({ column, label }: { column: string; label: string }) => {
    const isSorted = sortBy === column;
    return (
        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort(column)}>
            <div className="flex items-center gap-2">
                {label}
                {isSorted && (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />)}
            </div>
        </TableHead>
    );
  };
  
  return (
    <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search by name, username, ID, or address..."
                className="w-full max-w-sm pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                    {areFiltersActive && <span className="ml-2 h-2 w-2 rounded-full bg-primary" />}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Filter Users</DialogTitle>
                  <DialogDescription>
                    Apply filters to refine the user list.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex items-center space-x-4 rounded-md border p-4">
                     <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                            Show only users with BEP20 address
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Filter for users who have submitted their wallet address.
                        </p>
                     </div>
                     <Switch
                        checked={dialogAddressFilter}
                        onCheckedChange={setDialogAddressFilter}
                     />
                  </div>
                   <div className="flex items-center space-x-4 rounded-md border p-4">
                     <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                            Show only pending referral rewards
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Filter for users whose referral rewards haven't been sent.
                        </p>
                     </div>
                      <Switch
                        checked={dialogReferralFilter}
                        onCheckedChange={setDialogReferralFilter}
                     />
                  </div>
                  <div className="flex items-center space-x-4 rounded-md border p-4">
                     <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                            Show only users with pending status
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Filter for users whose reward status is 'pending' and have a wallet address.
                        </p>
                     </div>
                      <Switch
                        checked={dialogPendingStatusFilter}
                        onCheckedChange={setDialogPendingStatusFilter}
                     />
                  </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={clearFilters}>Clear Filters</Button>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Close</Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button type="button" onClick={handleApplyFilters}>Apply Filters</Button>
                    </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader column="name" label="Name" />
              <TableHead>BEP20 Address</TableHead>
              <TableHead className="text-center">Reward Status</TableHead>
              <SortableHeader column="mntc_earned" label="MNTC Earned" />
              <TableHead className="text-center">Reward Type</TableHead>
              <SortableHeader column="joinDate" label="Join Date" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                 Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-6 w-24 mx-auto" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-5 w-28 mx-auto" /></TableCell>
                    </TableRow>
                ))
            ) : users.length > 0 ? (
              users.map((user, index) => (
                <TableRow 
                  ref={index === users.length - 1 ? lastUserElementRef : null}
                  key={user.id} 
                  onClick={() => router.push(`/users/${user.id}`)} 
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                        <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-muted-foreground text-xs">@{user.username}</div>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{user.bep20_address || <span className="text-muted-foreground">N/A</span>}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getStatusVariant(user.reward_info?.reward_status)} className="capitalize">{user.reward_info?.reward_status.replace('_', ' ')}</Badge>
                  </TableCell>
                   <TableCell className="text-center font-medium">{(user.reward_info?.mntc_earned || 0) + ((user.referral_stats?.total_rewards ?? 0) * 2)}</TableCell>
                  <TableCell className="text-center">
                    <span className={cn(
                        "text-xs font-semibold capitalize px-2 py-1 rounded-full",
                        user.reward_info?.reward_type === 'referred' ? 'bg-blue-900/50 text-blue-300' : 'bg-green-900/50 text-green-300'
                    )}>
                        {user.reward_info?.reward_type}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground text-xs">{user.joinDate}</TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <UserX className="h-8 w-8" />
                      <p className="font-medium">No users found.</p>
                      {areFiltersActive || searchTerm ? (
                        <p className="text-sm">Try adjusting your search or filters. <button onClick={clearFilters} className="text-primary underline">Clear all filters</button>.</p>
                      ) : (
                        <p className="text-sm">There are no users to display.</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
            )}
            {loadingMore && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center">
                        <div className="flex justify-center items-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    </TableCell>
                </TableRow>
            )}
            {!hasMore && users.length > 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                        You've reached the end of the list.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

    