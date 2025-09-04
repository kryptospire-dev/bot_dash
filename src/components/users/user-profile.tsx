
"use client";

import { useState, useEffect } from 'react';
import type { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Bot, Instagram, Twitter, CheckCircle, XCircle, User as UserIcon, Wallet, Send, Gift, Hash, Users, DollarSign, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase-client';
import { doc, onSnapshot, DocumentData, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function UserProfileSkeleton() {
  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8">
      <Card className="w-full border-none shadow-none">
        <CardHeader className="text-center sm:text-left sm:flex-row sm:items-center sm:gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-24 sm:ml-auto" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center">
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
          <Separator />
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/4 mb-4" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-3/4" />
          </div>
          <Separator />
          <div className="space-y-2">
            <Skeleton className="h-6 w-1/4 mb-4" />
            <Skeleton className="h-5 w-full" />
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/2 mb-2" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/2 mb-2" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updatingReferral, setUpdatingReferral] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const userDocRef = doc(db, 'users', userId);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data() as DocumentData;
        const rewardInfo = userData.reward_info || {};
        const referralStats = userData.referral_stats || {};

        setUser({
          id: docSnap.id,
          name: userData.first_name || 'N/A',
          username: userData.username || 'N/A',
          user_id: userData.user_id,
          joinDate: userData.created_at?.toDate ? format(userData.created_at.toDate(), 'Pp') : 'N/A',
          lastSeen: userData.updated_at?.toDate ? format(userData.updated_at.toDate(), 'Pp') : 'N/A',
          currentStep: userData.current_step || 0,
          socialUsernames: userData.social_usernames || {},
          bep20_address: userData.bep20_address,
          screenshots: userData.screenshots || [],
          steps_completed: userData.steps_completed || {},
          verification_status: userData.verification_status || {},
          is_referred: userData.is_referred || false,
          referral_code: userData.referral_code,
          referred_by: userData.referred_by,
          referral_stats: {
            total_referrals: referralStats.total_referrals || 0,
            total_rewards: referralStats.total_rewards || 0,
          },
          reward_info: {
            mntc_earned: rewardInfo.mntc_earned || 0,
            reward_type: rewardInfo.reward_type || 'normal',
            completion_date: rewardInfo.completion_date?.toDate ? format(rewardInfo.completion_date.toDate(), 'Pp') : 'N/A',
            reward_status: rewardInfo.reward_status || 'not_completed',
          },
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching user ${userId} in real-time:`, error);
      toast({
        variant: "destructive",
        title: "Error fetching user",
        description: "There was a problem fetching the user data.",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, toast]);

  const handleMarkAsPaid = async () => {
    if (!user) return;
    setUpdating(true);
    const userDocRef = doc(db, 'users', user.id);
    try {
      await updateDoc(userDocRef, {
        "reward_info.reward_status": 'paid',
        "reward_info.status_updated_at": new Date(),
      });
      toast({
        title: "Success",
        description: "User reward status marked as 'paid'.",
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user status.",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSendReferralReward = async () => {
    if (!user || !user.referral_stats) return;

    setUpdatingReferral(true);
    const userDocRef = doc(db, 'users', user.id);
    const newTotalRewards = user.referral_stats.total_referrals;

    try {
      await updateDoc(userDocRef, {
        "referral_stats.total_rewards": newTotalRewards,
        "updated_at": new Date(),
      });
      toast({
        title: "Success",
        description: `Referral reward has been sent.`,
      });
    } catch (error) {
      console.error("Error updating referral rewards:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update referral rewards.",
      });
    } finally {
      setUpdatingReferral(false);
    }
  };

  if (loading) {
    return <UserProfileSkeleton />;
  }

  if (!user) {
    return <div className="text-center p-8">User not found.</div>;
  }

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

  const rewardStatus = user.reward_info?.reward_status || 'not_completed';
  const totalReferrals = user.referral_stats?.total_referrals || 0;
  const totalRewards = user.referral_stats?.total_rewards || 0;
  const canSendReferralReward = totalReferrals > 0 && totalReferrals !== totalRewards;

  return (
    <div className="animate-fadeIn">
      <Card className="w-full border-none shadow-none">
        <CardHeader className="text-center sm:text-left sm:flex-row sm:items-center sm:gap-4">
          <div>
            <CardTitle className="text-2xl">{user.name}</CardTitle>
            <CardDescription>@{user.username}</CardDescription>
          </div>
          <Badge variant={getStatusVariant(rewardStatus)} className="mt-2 sm:mt-0 sm:ml-auto capitalize text-base">
            {rewardStatus.replace('_', ' ')}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          {rewardStatus === 'pending' && (
            <div className="flex items-center justify-center pt-2">
              <Button onClick={handleMarkAsPaid} disabled={updating} className="transition-transform transform hover:scale-105">
                {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {updating ? 'Updating...' : 'Mark as Paid'}
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div className="flex items-center gap-3">
              <UserIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">User ID:</span>
              <span className="font-mono text-xs">{user.user_id || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Current Step:</span>
              <span>{user.currentStep}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Joined:</span>
              <span>{user.joinDate}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Last Seen:</span>
              <span>{user.lastSeen}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-semibold text-base">Social Accounts</h4>
            <div className="flex items-center gap-3">
              <Twitter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Twitter:</span>
              {user.socialUsernames?.twitter ? <span className="font-medium">@{user.socialUsernames.twitter}</span> : <span className="text-muted-foreground/80">Not provided</span>}
            </div>
            <div className="flex items-center gap-3">
              <Instagram className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Instagram:</span>
              {user.socialUsernames?.instagram ? <span className="font-medium">@{user.socialUsernames.instagram}</span> : <span className="text-muted-foreground/80">Not provided</span>}
            </div>
            <div className="flex items-center gap-3">
              <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">CoinMarketCap:</span>
              {user.socialUsernames?.coinmarketcap ? <span className="font-medium">{user.socialUsernames.coinmarketcap}</span> : <span className="text-muted-foreground/80">Not provided</span>}
            </div>
          </div>

          {user.bep20_address && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold text-base">Wallet</h4>
                <div className="flex items-start gap-3">
                  <Wallet className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <div>
                    <span className="text-muted-foreground">BEP20 Address:</span>
                    <p className="font-mono text-xs break-all">{user.bep20_address}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-4">
              <CardHeader className="p-2 pt-0">
                <CardTitle className="text-lg">Reward Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-2">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">MNTC Earned:</span>
                  <span className="font-bold">{user.reward_info?.mntc_earned} MNTC</span>
                </div>
                <div className="flex items-center gap-3">
                  <Gift className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Reward Type:</span>
                  <span className="font-medium capitalize">{user.reward_info?.reward_type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Completed:</span>
                  <span>{user.reward_info?.completion_date}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="p-4">
              <CardHeader className="p-2 pt-0 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Referral Info</CardTitle>
                {canSendReferralReward && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" disabled={updatingReferral}>
                        <Send className="mr-2 h-4 w-4" />
                        Send Reward
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Referral Reward</AlertDialogTitle>
                        <AlertDialogDescription>
                          You are sending <span className="font-bold">{(totalReferrals*2)-(totalRewards*2)} MNTC</span> for <span className="font-bold">{((totalReferrals*2)-(totalRewards*2))/2} new successful referrals</span>.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={updatingReferral}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSendReferralReward} disabled={updatingReferral}>
                          {updatingReferral && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {updatingReferral ? 'Sending...' : 'Confirm & Send'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardHeader>
              <CardContent className="space-y-3 p-2">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Total Referral's Reward:</span>
                  <span className="font-bold">{totalReferrals*2}</span>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Referral Rewards:</span>
                  <span className="font-bold">{totalRewards*2} MNTC</span>
                </div>
                <div className="flex items-center gap-3">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Was Referred:</span>
                  <Badge variant={user.is_referred ? "secondary" : "outline"} className={cn(user.is_referred ? "text-green-300" : "")}>{user.is_referred ? 'Yes' : 'No'}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-base mb-3">Verification Status</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {user.verification_status?.twitter ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  <span>Twitter</span>
                </div>
                <div className="flex items-center gap-2">
                  {user.verification_status?.instagram ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  <span>Instagram</span>
                </div>
                <div className="flex items-center gap-2">
                  {user.verification_status?.coinmarketcap ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  <span>CoinMarketCap</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-base mb-3">Steps Completed</h4>
              <div className="space-y-3">
                {user.steps_completed && Object.keys(user.steps_completed).length > 0 ? Object.entries(user.steps_completed).sort().map(([step, completed]) => (
                  <div key={step} className="flex items-center gap-2">
                    {completed ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                    <span className="capitalize">{step.replace(/_/g, ' ')}</span>
                  </div>
                )) : <p className="text-muted-foreground/80">No steps completed yet.</p>}
              </div>
            </div>
          </div>

          {user.screenshots && user.screenshots.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-semibold text-base">Screenshots</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {user.screenshots.map((url, index) => (
                    <a href={url} target="_blank" rel="noopener noreferrer" key={index}>
                      <img src={url} alt={`Screenshot ${index + 1}`} className="rounded-lg object-cover aspect-square hover:opacity-80 transition-all duration-300 transform hover:scale-105 border" data-ai-hint="user screenshot" />
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
}