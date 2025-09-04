
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckCircle, RefreshCw, LogOut, DollarSign, UserCheck, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase-client';
import { collection, getDocs, query, DocumentData } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import UsersTable from '@/components/users/users-table';
import type { UserGrowthData } from '@/lib/types';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardCharts } from '@/components/dashboard-charts';
import { useUserStore } from '@/store/user-store';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    deliveredUsers: 0,
    totalMntcPaid: 0,
    pendingReferralRewards: 0,
  });
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthData[]>([]);

  const router = useRouter();

  const resetFilters = useUserStore(state => state.reset);
  
  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    if (isAuthenticated !== 'true') {
      router.push('/login');
    } else {
      fetchInitialData();
    }
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    resetFilters();
    router.push('/login');
  };
  
  const fetchStats = useCallback(async () => {
    try {
      const usersQuery = query(collection(db, 'users'));
      const usersQuerySnapshot = await getDocs(usersQuery);
      let totalUsers = 0;
      let deliveredUsersCount = 0;
      let totalMntcPaid = 0;
      let pendingReferralRewardsCount = 0;
      const dailyGrowth: { [key: string]: number } = {};

      usersQuerySnapshot.forEach((doc) => {
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

    } catch (error) {
      console.error("Error fetching stats: ", error);
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setInitialLoading(true);
    try {
      await fetchStats();
    } catch (error) {
      console.error("Error fetching initial data: ", error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [fetchStats]);

  const handleRefresh = useCallback(() => {
    fetchInitialData();
  }, [fetchInitialData]);

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
        <p className="text-muted-foreground">Please wait while we fetch the latest data.</p>
      </div>
    );
  }

  return (
    <main className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 animate-fadeIn">
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
      
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="space-y-4">
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
            <DashboardCharts userGrowthData={userGrowthData} loading={loading} />
        </TabsContent>
        <TabsContent value="users" className="space-y-4">
            <div className="animate-fadeIn" style={{animationDelay: '0.2s'}}>
                <UsersTable />
            </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
