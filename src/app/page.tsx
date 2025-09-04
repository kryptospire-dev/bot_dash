
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckCircle, RefreshCw, LogOut, DollarSign, UserCheck } from 'lucide-react';
import { db } from '@/lib/firebase-client';
import { collection, getDocs, query, DocumentData, where, limit, startAfter, orderBy, Query, QueryConstraint } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import UsersTable from '@/components/users/users-table';
import type { User } from '@/lib/types';
import { format } from 'date-fns';

const PAGE_SIZE = 20;

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    deliveredUsers: 0,
    totalMntcPaid: 0,
    pendingReferralRewards: 0,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [showOnlyWithAddress, setShowOnlyWithAddress] = useState(false);
  const [showOnlyPendingReferral, setShowOnlyPendingReferral] = useState(false);
  const [showOnlyPendingStatus, setShowOnlyPendingStatus] = useState(false);
  
  const [sortBy, setSortBy] = useState('joinDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    if (isAuthenticated !== 'true') {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    router.push('/login');
  };
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const mapDocToUser = (doc: DocumentData): User => {
    const userData = doc.data() as DocumentData;
    const rewardInfo = userData.reward_info || {};
    const referralStats = userData.referral_stats || {};

    return {
        id: doc.id,
        name: userData.first_name || 'N/A',
        username: userData.username || userData.user_id?.toString() || 'N/A',
        joinDate: userData.created_at?.toDate ? format(userData.created_at.toDate(), 'Pp') : 'N/A',
        created_at: userData.created_at, // Keep the timestamp for sorting
        lastSeen: userData.updated_at?.toDate ? format(userData.updated_at.toDate(), 'Pp') : 'N/A',
        bep20_address: userData.bep20_address,
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

  const fetchUsers = useCallback(async (isNewQuery = false) => {
    if (loadingMore) return;

    if (isNewQuery) {
        setLoading(true);
        setUsers([]);
        setLastVisible(null);
        setHasMore(true);
    } else {
        setLoadingMore(true);
    }

    try {
        const usersRef = collection(db, 'users');
        let sortField:string = 'created_at';
        if (sortBy === 'name') sortField = 'first_name';
        if (sortBy === 'mntc_earned') sortField = 'reward_info.mntc_earned';
        
        const queryConstraints: QueryConstraint[] = [];

        if (showOnlyWithAddress) {
            queryConstraints.push(where("bep20_address", ">", ""));
        }

        if (showOnlyPendingStatus) {
            queryConstraints.push(where("reward_info.reward_status", "==", "pending"));
            queryConstraints.push(where("bep20_address", ">", ""));
        }
        
        queryConstraints.push(orderBy(sortField, sortDirection));

        if (!isNewQuery && lastVisible) {
            queryConstraints.push(startAfter(lastVisible));
        }
        
        queryConstraints.push(limit(PAGE_SIZE));

        const q = query(usersRef, ...queryConstraints);
        const documentSnapshots = await getDocs(q);

        let newUsers = documentSnapshots.docs.map(mapDocToUser);
        const lastVis = documentSnapshots.docs[documentSnapshots.docs.length - 1];
        
        setLastVisible(lastVis);
        setHasMore(documentSnapshots.docs.length === PAGE_SIZE);
        
        if (isNewQuery) {
            setUsers(newUsers);
        } else {
            setUsers(prevUsers => [...prevUsers, ...newUsers]);
        }

    } catch (error) {
        console.error("Error fetching users: ", error);
    } finally {
        if(isNewQuery) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
    }
  }, [loadingMore, lastVisible, showOnlyWithAddress, showOnlyPendingStatus, sortBy, sortDirection]);

  const fetchStats = useCallback(async () => {
    try {
      const usersQuery = query(collection(db, 'users'));
      const usersQuerySnapshot = await getDocs(usersQuery);
      let totalUsers = 0;
      let deliveredUsersCount = 0;
      let totalMntcPaid = 0;
      let pendingReferralRewardsCount = 0;
      
      usersQuerySnapshot.forEach((doc) => {
        totalUsers++;
        const userData = doc.data() as DocumentData;
        const rewardInfo = userData.reward_info || {};
        const referralStats = userData.referral_stats || {};

        if (rewardInfo.reward_status === 'paid') {
          deliveredUsersCount++;
          totalMntcPaid += (rewardInfo.mntc_earned || 0) + ((referralStats.total_rewards || 0) * 2);
        }

        const totalReferrals = referralStats.total_referrals || 0;
        const totalRewards = referralStats.total_rewards || 0;
        if (totalReferrals !== totalRewards) {
          pendingReferralRewardsCount++;
        }
      });
      
      setStats({
        totalUsers,
        deliveredUsers: deliveredUsersCount,
        totalMntcPaid: totalMntcPaid,
        pendingReferralRewards: pendingReferralRewardsCount,
      });

    } catch (error) {
      console.error("Error fetching stats: ", error);
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchStats(), fetchUsers(true)]);
    } catch (error) {
      console.error("Error fetching initial data: ", error);
    } finally {
      setLoading(false);
    }
  }, [fetchStats, fetchUsers]);

  const handleRefresh = useCallback(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchUsers(true);
  }, [showOnlyWithAddress, showOnlyPendingReferral, showOnlyPendingStatus, sortBy, sortDirection, debouncedSearchTerm]);
  
  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (showOnlyPendingReferral) {
        filtered = filtered.filter(user => {
            const totalReferrals = user.referral_stats?.total_referrals || 0;
            const totalRewards = user.referral_stats?.total_rewards || 0;
            return totalReferrals !== totalRewards;
        });
    }

    if (debouncedSearchTerm) {
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        filtered = filtered.filter(
          (user) =>
            user.name.toLowerCase().includes(lowercasedTerm) ||
            user.id.toLowerCase().includes(lowercasedTerm) ||
            user.username.toLowerCase().includes(lowercasedTerm) ||
            user.bep20_address?.toLowerCase().includes(lowercasedTerm)
        );
    }
    return filtered;

  }, [debouncedSearchTerm, users, showOnlyPendingReferral]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };


  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users },
    { title: 'Delivered Users', value: stats.deliveredUsers, icon: CheckCircle },
    { title: 'Pending Referral Rewards', value: stats.pendingReferralRewards, icon: UserCheck },
    { title: 'Total MNTC Paid', value: stats.totalMntcPaid.toLocaleString(), icon: DollarSign },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
            <Button onClick={handleRefresh} disabled={loading} variant="outline">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-6 w-6 rounded-sm" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/3 mt-2" />
              </CardContent>
            </Card>
          ))
        ) : (
          statCards.map((card, index) => (
            <Card 
                key={card.title} 
                className="animate-slideUp" 
                style={{animationDelay: `${index * 0.1}s`}}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <div className="space-y-4">
        <h3 className="text-2xl font-bold tracking-tight">Users</h3>
        <div className="animate-fadeIn" style={{animationDelay: '0.2s'}}>
            <UsersTable
                users={filteredUsers}
                fetchUsers={() => fetchUsers(false)}
                hasMore={hasMore}
                loading={loading}
                loadingMore={loadingMore}
                setSearchTerm={setSearchTerm}
                searchTerm={searchTerm}
                showOnlyWithAddress={showOnlyWithAddress}
                setShowOnlyWithAddress={setShowOnlyWithAddress}
                showOnlyPendingReferral={showOnlyPendingReferral}
                setShowOnlyPendingReferral={setShowOnlyPendingReferral}
                showOnlyPendingStatus={showOnlyPendingStatus}
                setShowOnlyPendingStatus={setShowOnlyPendingStatus}
                sortBy={sortBy}
                sortDirection={sortDirection}
                handleSort={handleSort}
            />
        </div>
      </div>
    </div>
  );
}

    