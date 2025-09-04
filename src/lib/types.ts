
export type User = {
  id: string;
  name: string;
  username: string;
  user_id?: number;
  joinDate: string; // created_at
  created_at?: any; // For sorting
  lastSeen: string; // updated_at
  currentStep?: number;
  socialUsernames?: {
    twitter?: string;
    instagram?: string;
    coinmarketcap?: string;
  };
  bep20_address?: string;
  screenshots?: string[];
  steps_completed?: { [key: string]: boolean };
  verification_status?: {
    telegram?: boolean;
    twitter?: boolean;
    instagram?: boolean;
  };
  is_referred?: boolean;
  referral_code?: string;
  referred_by?: string;
  referral_stats?: {
    total_referrals: number;
    total_rewards: number;
  };
  reward_info?: {
    mntc_earned: number;
    reward_type: 'normal' | 'referred';
    completion_date: string;
    reward_status: 'not_completed' | 'pending' | 'paid';
  }
};

export type UserActivity = {
  id: string;
  date: string;
  action: string;
  details: string;
}

export type Trend = {
  feature: string;
  usage: number;
  fill: string;
};

export type UserGrowthData = {
  date: string;
  users: number;
};
