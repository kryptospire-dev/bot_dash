
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckCircle, RefreshCw, LogOut, DollarSign, UserCheck, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase-client';
import { collection, getDocs, query, DocumentData, where, orderBy, QueryConstraint, limit, startAfter } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import UsersTable from '@/components/users/users-table';
import type { User, UserGrowthData } from '@/lib/types';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardCharts } from '@/components/dashboard-charts';

const PAGE_SIZE = 30;

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    deliveredUsers: 0,
    totalMntcPaid: 0,
    pendingReferralRewards: 0,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
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
      fetchInitialData();
    }
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    router.push('/login');
  };
  
  useEffect(() => {
      setUsers([]);
      setLastVisible(null);
      setHasMore(true);
      fetchUsers(true); 
  }, [showOnlyWithAddress, showOnlyPendingReferral, showOnlyPendingStatus, sortBy, sortDirection, searchTerm]);


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

  const fetchUsers = useCallback(async (isInitialFetch = false) => {
    if (isInitialFetch) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
        const usersRef = collection(db, 'users');
        
        if (searchTerm) {
            setLoading(true);
            const lowercasedTerm = searchTerm.toLowerCase();
            const nameQuery = query(usersRef, where('first_name', '>=', searchTerm), where('first_name', '<=', searchTerm + '\uf8ff'));
            const usernameQuery = query(usersRef, where('username', '>=', lowercasedTerm), where('username', '<=', lowercasedTerm + '\uf8ff'));
            const addressQuery = query(usersRef, where('bep20_address', '==', searchTerm));

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

            setUsers(searchResults);
            setHasMore(false);
            setLoading(false);

        } else {
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

            if (lastVisible && !isInitialFetch) {
              queryConstraints.push(startAfter(lastVisible));
            }

            queryConstraints.push(limit(PAGE_SIZE));
            
            const q = query(usersRef, ...queryConstraints);
            const querySnapshot = await getDocs(q);

            const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            setLastVisible(newLastVisible);

            if(querySnapshot.docs.length < PAGE_SIZE) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            let newUsers = querySnapshot.docs.map(mapDocToUser);
            
            if (showOnlyPendingReferral && !searchTerm) {
                newUsers = newUsers.filter(user => {
                    const totalReferrals = user.referral_stats?.total_referrals || 0;
                    const totalRewards = user.referral_stats?.total_rewards || 0;
                    return totalReferrals !== totalRewards;
                });
            }

            setUsers(prev => isInitialFetch ? newUsers : [...prev, ...newUsers]);
        }

    } catch (error) {
        console.error("Error fetching users: ", error);
    } finally {
        if (isInitialFetch) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
    }
  }, [showOnlyWithAddress, showOnlyPendingReferral, showOnlyPendingStatus, sortBy, sortDirection, searchTerm, lastVisible]);
  
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
    setUsers([]);
    setLastVisible(null);
    setHasMore(true);
    fetchUsers(true);
  }, [fetchInitialData, fetchUsers]);

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
                <UsersTable
                    users={users}
                    loading={loading}
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
                    fetchNextPage={() => fetchUsers(false)}
                    hasMore={hasMore}
                    loadingMore={loadingMore}
                />
            </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
