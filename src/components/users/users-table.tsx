
"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Search, UserX } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type TableFilter = 'all' | 'pending_referral';

interface UsersTableProps {
    users: User[];
    initialFilter: TableFilter;
}

export default function UsersTable({ users, initialFilter }: UsersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyWithAddress, setShowOnlyWithAddress] = useState(false);
  const [showOnlyPendingReferral, setShowOnlyPendingReferral] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<TableFilter>(initialFilter);
  const router = useRouter();

  useEffect(() => {
    setCurrentFilter(initialFilter);
    if (initialFilter === 'pending_referral') {
      setShowOnlyPendingReferral(true);
    } else {
      setShowOnlyPendingReferral(false);
    }
  }, [initialFilter]);

  const filteredUsers = useMemo(() => {
    let filtered = users;
    
    if (showOnlyPendingReferral) {
        filtered = filtered.filter(user => {
            const totalReferrals = user.referral_stats?.total_referrals || 0;
            const totalRewards = user.referral_stats?.total_rewards || 0;
            return totalReferrals !== totalRewards;
        });
    }

    if (showOnlyWithAddress) {
        filtered = filtered.filter((user) => !!user.bep20_address);
    }
    
    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (user) =>
            user.name.toLowerCase().includes(lowercasedTerm) ||
            user.id.toLowerCase().includes(lowercasedTerm) ||
            user.username.toLowerCase().includes(lowercasedTerm) ||
            user.bep20_address?.toLowerCase().includes(lowercasedTerm)
        );
    }
    return filtered;

  }, [searchTerm, users, showOnlyWithAddress, showOnlyPendingReferral]);

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

  const clearFilters = () => {
    setSearchTerm('');
    setShowOnlyWithAddress(false);
    setShowOnlyPendingReferral(false);
    setCurrentFilter('all');
  }

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
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center space-x-2">
                  <Checkbox id="bep20-filter" checked={showOnlyWithAddress} onCheckedChange={(checked) => setShowOnlyWithAddress(!!checked)} />
                  <Label htmlFor="bep20-filter" className="text-sm font-medium leading-none cursor-pointer">
                      Show only users with BEP20 address
                  </Label>
              </div>
               <div className="flex items-center space-x-2">
                  <Checkbox id="referral-filter" checked={showOnlyPendingReferral} onCheckedChange={(checked) => setShowOnlyPendingReferral(!!checked)} />
                  <Label htmlFor="referral-filter" className="text-sm font-medium leading-none cursor-pointer">
                      Show only pending referral rewards
                  </Label>
              </div>
            </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>BEP20 Address</TableHead>
              <TableHead className="text-center">Reward Status</TableHead>
              <TableHead className="text-center">MNTC Earned</TableHead>
              <TableHead className="text-center">Reward Type</TableHead>
              <TableHead className="text-center">Join Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.id} onClick={() => router.push(`/users/${user.id}`)} className="cursor-pointer">
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
                    <p className="text-sm">Try adjusting your search or filters. <button onClick={clearFilters} className="text-primary underline">Clear all filters</button>.</p>
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
