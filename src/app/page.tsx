
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckCircle, RefreshCw, LogOut, DollarSign, UserCheck, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase-client';
import { collection, getDocs, query, DocumentData } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import UsersTable from '@/components/users/users-table';
import type { User, UserGrowthData } from '@/lib/types';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardCharts } from '@/components/dashboard-charts';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    deliveredUsers: 0,
    totalMntcPaid: 0,
    pendingReferralRewards: 0,
  });
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [displayedUsers, setDisplayedUsers] = useState<User[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyWithAddress, setShowOnlyWithAddress] = useState(false);
  const [showOnlyPendingReferral, setShowOnlyPendingReferral] = useState(false);
  const [showOnlyPendingStatus, setShowOnlyPendingStatus] = useState(false);
  
  const [sortBy, setSortBy] = useState('joinDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthData[]>([]);

  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    if (isAuthenticated !== 'true') {
      router.push('/login');
    } else {
      fetchAllData();
    }
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    router.push('/login');
  };
  
  const mapDocToUser = (doc: DocumentData): User => {
    const userData = doc.data() as DocumentData;
    const rewardInfo = userData.reward_info || {};
    const referralStats = userData.referral_stats || {};

    return {
        id: doc.id,
        name: userData.first_name || 'N/A',
        username: userData.username || userData.user_id?.toString() || 'N/A',
        joinDate: userData.created_at?.toDate ? format(userData.created_at.toDate(), 'Pp') : 'N/A',
        created_at: userData.created_at, 
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

  const fetchAllData = useCallback(async () => {
    if (initialLoading) {
      setInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }
    
    try {
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef);
      const querySnapshot = await getDocs(usersQuery);

      let totalUsers = 0;
      let deliveredUsersCount = 0;
      let totalMntcPaid = 0;
      let pendingReferralRewardsCount = 0;
      const dailyGrowth: { [key: string]: number } = {};
      
      const fetchedUsers = querySnapshot.docs.map(doc => {
        totalUsers++;
        const userData = doc.data() as DocumentData;
        const rewardInfo = userData.reward_info || {};
        const referralStats = userData.referral_stats || {};

        if (userData.created_at?.toDate) {
            const joinDate = userData.created_at.toDate();
            const dateKey = format(joinDate, 'MMM dd, yyyy');
            dailyGrowth[dateKey] = (dailyGrowth[dateKey] || 0) + 1;
        }

        if (rewardInfo.reward_status === 'paid') {
          deliveredUsersCount++;
          totalMntcPaid += (rewardInfo.mntc_earned || 0) + ((referralStats.total_rewards || 0) * 2);
        }

        const totalReferrals = referralStats.total_referrals || 0;
        const totalRewards = referralStats.total_rewards || 0;
        if (totalReferrals !== totalRewards) {
          pendingReferralRewardsCount++;
        }
        
        return mapDocToUser(doc);
      });

      const growthData: UserGrowthData[] = Object.entries(dailyGrowth)
          .map(([date, users]) => ({ date, users }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setUserGrowthData(growthData);
      setStats({
        totalUsers,
        deliveredUsers: deliveredUsersCount,
        totalMntcPaid: totalMntcPaid,
        pendingReferralRewards: pendingReferralRewardsCount,
      });

      setAllUsers(fetchedUsers);

    } catch (error) {
        console.error("Error fetching all users: ", error);
    } finally {
        setInitialLoading(false);
        setIsRefreshing(false);
    }
  }, [initialLoading]);

  useEffect(() => {
    let filtered = [...allUsers];

    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(user => 
            user.name.toLowerCase().includes(lowercasedTerm) ||
            user.username.toLowerCase().includes(lowercasedTerm) ||
            user.bep20_address?.toLowerCase().includes(lowercasedTerm)
        );
    }

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
            return totalReferrals !== totalRewards;
        });
    }

    const sortUsers = (users: User[]) => {
      return [...users].sort((a, b) => {
        let valA, valB;
        
        if (sortBy === 'joinDate') {
          valA = a.created_at?.toMillis() || 0;
          valB = b.created_at?.toMillis() || 0;
        } else if (sortBy === 'name') {
          valA = a.name || '';
          valB = b.name || '';
        } else if (sortBy === 'mntc_earned') {
          valA = (a.reward_info?.mntc_earned || 0) + ((a.referral_stats?.total_rewards || 0) * 2);
          valB = (b.reward_info?.mntc_earned || 0) + ((b.referral_stats?.total_rewards || 0) * 2);
        } else {
          return 0;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    };
    
    setDisplayedUsers(sortUsers(filtered));

  }, [allUsers, searchTerm, showOnlyWithAddress, showOnlyPendingReferral, showOnlyPendingStatus, sortBy, sortDirection]);
  
  const handleRefresh = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

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

  if (initialLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
        <div className="flex items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h1 className="text-2xl font-semibold text-muted-foreground">Loading Dashboard...</h1>
        </div>
        <p className="text-muted-foreground">Fetching all user data. This may take a moment.</p>
      </div>
    );
  }

  return (
    <main className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
            <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </Button>
        </div>
      </div>
      
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {isRefreshing ? (
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
            <DashboardCharts userGrowthData={userGrowthData} loading={isRefreshing} />
        </TabsContent>
        <TabsContent value="users" className="space-y-4">
            <div className="animate-fadeIn" style={{animationDelay: '0.2s'}}>
                <UsersTable
                    users={displayedUsers}
                    loading={isRefreshing}
                    setSearchTerm={setSearchTerm}
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
        </TabsContent>
      </Tabs>
    </main>
  );
}
