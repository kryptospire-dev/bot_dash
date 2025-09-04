
"use client";

import { useState, useMemo } from "react";
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
import { Search, UserX, Filter, ArrowUp, ArrowDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import UserProfile from "./user-profile";


interface UsersTableProps {
    users: User[];
    loading: boolean;
}

const columnHelper = createColumnHelper<User>();

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

const columns: ColumnDef<User, any>[] = [
  columnHelper.accessor('name', {
    id: 'name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        {column.getIsSorted() === "asc" && <ArrowUp className="ml-2 h-4 w-4" />}
        {column.getIsSorted() === "desc" && <ArrowDown className="ml-2 h-4 w-4" />}
      </Button>
    ),
    cell: info => <div className="font-medium">{info.getValue()}</div>,
  }),
  columnHelper.accessor('username', {
    id: 'username',
    header: 'Username',
    cell: info => <div className="text-muted-foreground">@{info.getValue()}</div>
  }),
  columnHelper.accessor('bep20_address', {
    id: 'bep20_address',
    header: 'BEP20 Address',
    cell: info => info.getValue() ? <span className="font-mono text-xs">{info.getValue()}</span> : <span className="text-muted-foreground">N/A</span>
  }),
  columnHelper.accessor(row => row.reward_info?.reward_status, {
    id: 'reward_status',
    header: () => <div className="text-center">Reward Status</div>,
    cell: info => (
      <div className="text-center">
        <Badge variant={getStatusVariant(info.getValue())} className="capitalize">{info.getValue()?.replace('_', ' ')}</Badge>
      </div>
    )
  }),
  columnHelper.accessor(row => (row.reward_info?.mntc_earned || 0) + ((row.referral_stats?.total_rewards ?? 0) * 2), {
    id: 'mntc_earned',
    header: ({ column }) => (
        <div className="text-center">
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                MNTC Earned
                {column.getIsSorted() === "asc" && <ArrowUp className="ml-2 h-4 w-4" />}
                {column.getIsSorted() === "desc" && <ArrowDown className="ml-2 h-4 w-4" />}
            </Button>
        </div>
    ),
    cell: info => <div className="text-center font-medium">{info.getValue()}</div>,
  }),
  columnHelper.accessor(row => row.reward_info?.reward_type, {
    id: 'reward_type',
    header: () => <div className="text-center">Reward Type</div>,
    cell: info => (
      <div className="text-center">
        <span className={cn(
            "text-xs font-semibold capitalize px-2 py-1 rounded-full",
            info.getValue() === 'referred' ? 'bg-blue-900/50 text-blue-300' : 'bg-green-900/50 text-green-300'
        )}>
            {info.getValue()}
        </span>
      </div>
    )
  }),
  columnHelper.accessor(row => row.created_at, {
    id: 'joinDate',
    header: ({ column }) => (
        <div className="text-right">
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Join Date
                {column.getIsSorted() === "asc" && <ArrowUp className="ml-2 h-4 w-4" />}
                {column.getIsSorted() === "desc" && <ArrowDown className="ml-2 h-4 w-4" />}
            </Button>
        </div>
    ),
    cell: info => <div className="text-right text-muted-foreground text-xs">{info.row.original.joinDate}</div>,
    sortingFn: 'datetime'
  })
];

export default function UsersTable({ 
    users, 
    loading,
}: UsersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  const [searchColumn, setSearchColumn] = useState('name');
  const [searchValue, setSearchValue] = useState('');

  const [showOnlyWithAddress, setShowOnlyWithAddress] = useState(false);
  const [showOnlyPendingReferral, setShowOnlyPendingReferral] = useState(false);
  const [showOnlyPendingStatus, setShowOnlyPendingStatus] = useState(false);
  
  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (showOnlyWithAddress) {
        filtered = filtered.filter(user => !!user.bep20_address);
    }
    if (showOnlyPendingStatus) {
        filtered = filtered.filter(user => user.reward_info?.reward_status === 'pending' && !!user.bep20_address);
    }
    if (showOnlyPendingReferral) {
        filtered = filtered.filter(user => {
            const totalReferrals = user.referral_stats?.total_referrals || 0;
            const totalRewards = user.referral_stats?.total_rewards || 0;
            return totalReferrals > 0 && totalReferrals !== totalRewards;
        });
    }
    return filtered;
  }, [users, showOnlyWithAddress, showOnlyPendingStatus, showOnlyPendingReferral]);


  const table = useReactTable({
    data: filteredUsers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
        pagination: {
            pageSize: 10,
        }
    }
  });
  
  const handleRowClick = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleDialogClose = () => {
    setSelectedUserId(null);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchValue(value);
    table.getColumn(searchColumn)?.setFilterValue(value);
  }

  const handleSearchColumnChange = (value: string) => {
    // Clear previous column filter
    table.getColumn(searchColumn)?.setFilterValue('');
    setSearchColumn(value);
    // Apply current search value to new column
    table.getColumn(value)?.setFilterValue(searchValue);
  }

  const clearFilters = () => {
    setColumnFilters([]);
    setSearchValue('');
    setShowOnlyWithAddress(false);
    setShowOnlyPendingReferral(false);
    setShowOnlyPendingStatus(false);
  }

  const areFiltersActive = columnFilters.length > 0 || showOnlyWithAddress || showOnlyPendingReferral || showOnlyPendingStatus;

  return (
    <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                    type="search"
                    placeholder={`Search by ${searchColumn}...`}
                    className="w-full pl-10"
                    value={searchValue}
                    onChange={handleSearchChange}
                    />
                </div>
                <Select value={searchColumn} onValueChange={handleSearchColumnChange}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Search by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="username">Username</SelectItem>
                        <SelectItem value="bep20_address">BEP20 Address</SelectItem>
                    </SelectContent>
                </Select>
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
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex items-center space-x-4 rounded-md border p-4">
                     <div className="flex-1 space-y-1">
                        <Label htmlFor='address-filter' className="text-sm font-medium leading-none">
                            Show only users with BEP20 address
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Filter for users who have submitted their wallet address.
                        </p>
                     </div>
                     <Switch
                        id='address-filter'
                        checked={showOnlyWithAddress}
                        onCheckedChange={setShowOnlyWithAddress}
                     />
                  </div>
                   <div className="flex items-center space-x-4 rounded-md border p-4">
                     <div className="flex-1 space-y-1">
                        <Label htmlFor='referral-filter' className="text-sm font-medium leading-none">
                            Show only pending referral rewards
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Filter for users whose referral rewards haven't been sent.
                        </p>
                     </div>
                      <Switch
                        id='referral-filter'
                        checked={showOnlyPendingReferral}
                        onCheckedChange={setShowOnlyPendingReferral}
                     />
                  </div>
                  <div className="flex items-center space-x-4 rounded-md border p-4">
                     <div className="flex-1 space-y-1">
                        <Label htmlFor='pending-filter' className="text-sm font-medium leading-none">
                            Show only users with pending status
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Filter for users whose reward status is 'pending' and have a wallet address.
                        </p>
                     </div>
                      <Switch
                        id='pending-filter'
                        checked={showOnlyPendingStatus}
                        onCheckedChange={setShowOnlyPendingStatus}
                     />
                  </div>
                </div>
                <DialogFooter className="sm:justify-between">
                    <Button type="button" variant="ghost" onClick={clearFilters}>Clear All Filters</Button>
                    <DialogClose asChild>
                        <Button type="button">Done</Button>
                    </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
                 Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={columns.length}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => handleRowClick(row.original.id)}
                  className="cursor-pointer"
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <UserX className="h-8 w-8" />
                      <p className="font-medium">No users found.</p>
                       {areFiltersActive ? (
                        <p className="text-sm">Try adjusting your search or filters. <button onClick={clearFilters} className="text-primary underline">Clear all filters</button>.</p>
                      ) : (
                        <p className="text-sm">There are no users to display.</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
       <div className="flex items-center justify-between p-2 border-t">
        <div className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
            >
                <ChevronsLeft className="h-4 w-4"/>
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
            >
                <ChevronLeft className="h-4 w-4"/>
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
            >
                <ChevronRight className="h-4 w-4"/>
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
            >
                <ChevronsRight className="h-4 w-4"/>
            </Button>
        </div>
      </div>
      <Dialog open={!!selectedUserId} onOpenChange={(open) => !open && handleDialogClose()}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                  <DialogTitle>User Details</DialogTitle>
                   <DialogClose />
              </DialogHeader>
              {selectedUserId && <UserProfile userId={selectedUserId} />}
          </DialogContent>
      </Dialog>
    </div>
  );
}
