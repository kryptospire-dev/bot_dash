
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckCircle, RefreshCw, LogOut, DollarSign, UserCheck } from 'lucide-react';
import { db } from '@/lib/firebase-client';
import { collection, getDocs, query, DocumentData } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import UsersTable from '@/components/users/users-table';
import type { User } from '@/lib/types';
import { format } from 'date-fns';

type TableFilter = 'all' | 'pending_referral';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    deliveredUsers: 0,
    totalMntcPaid: 0,
    pendingReferralRewards: 0,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState<TableFilter>('all');
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

  const fetchData = useCallback(async (isRefresh: boolean = false) => {
    if (!isRefresh) {
      setLoading(true);
    }

    try {
      const usersQuery = query(collection(db, 'users'));
      const usersQuerySnapshot = await getDocs(usersQuery);
      const totalUsers = usersQuerySnapshot.size;
      
      const usersData: User[] = [];
      let deliveredUsersCount = 0;
      let totalMntcPaid = 0;
      let pendingReferralRewardsCount = 0;
      
      usersQuerySnapshot.forEach((doc) => {
        const userData = doc.data() as DocumentData;
        const rewardInfo = userData.reward_info || {};
        const referralStats = userData.referral_stats || {};

        if (rewardInfo.reward_status === 'paid') {
          deliveredUsersCount++;
          totalMntcPaid += rewardInfo.mntc_earned || 0;
        }

        totalMntcPaid += referralStats.total_rewards || 0;

        const totalReferrals = referralStats.total_referrals || 0;
        const totalRewards = referralStats.total_rewards || 0;
        if (totalReferrals !== totalRewards) {
          pendingReferralRewardsCount++;
        }

        usersData.push({
            id: doc.id,
            name: userData.first_name || 'N/A',
            username: userData.username || userData.user_id?.toString() || 'N/A',
            joinDate: userData.created_at?.toDate ? format(userData.created_at.toDate(), 'Pp') : 'N/A',
            lastSeen: userData.updated_at?.toDate ? format(userData.updated_at.toDate(), 'Pp') : 'N/A',
            bep20_address: userData.bep20_address,
            reward_info: {
              mntc_earned: rewardInfo.mntc_earned || 0,
              reward_status: rewardInfo.reward_status || 'not_completed',
              reward_type: rewardInfo.reward_type || 'normal',
              completion_date: rewardInfo.completion_date?.toDate ? format(rewardInfo.completion_date.toDate(), 'Pp') : 'N/A',
            },
            referral_stats: {
                total_referrals: totalReferrals,
                total_rewards: totalRewards,
            },
        });
      });
      
      setUsers(usersData);
      setStats({
        totalUsers: totalUsers,
        deliveredUsers: deliveredUsersCount,
        totalMntcPaid: totalMntcPaid,
        pendingReferralRewards: pendingReferralRewardsCount,
      });

    } catch (error) {
      console.error("Error fetching data: ", error);
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData(true);
  }

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, filter: 'all' as TableFilter },
    { title: 'Delivered Users', value: stats.deliveredUsers, icon: CheckCircle, filter: 'all' as TableFilter },
    { title: 'Pending Referral Rewards', value: stats.pendingReferralRewards, icon: UserCheck, filter: 'pending_referral' as TableFilter },
    { title: 'Total MNTC Paid', value: stats.totalMntcPaid.toLocaleString(), icon: DollarSign, filter: 'all' as TableFilter },
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
                onClick={() => setTableFilter(card.filter)}
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
         {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full max-w-sm" />
              <div className="rounded-md border">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border-b">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="animate-fadeIn" style={{animationDelay: '0.2s'}}>
                <UsersTable users={users} initialFilter={tableFilter} />
            </div>
          )}
      </div>
    </div>
  );
}
