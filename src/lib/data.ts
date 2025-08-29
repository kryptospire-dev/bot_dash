
import type { User, UserActivity, Trend } from './types';

export const userActivities: UserActivity[] = [];

export const stats = {
  totalUsers: 10259,
  activeUsers: 8750,
  messagesSent: 125730,
  engagementRate: 85.3,
};

export const userGrowthData = [
  { month: 'Jan', users: 4000 },
  { month: 'Feb', users: 4500 },
  { month: 'Mar', users: 5200 },
  { month: 'Apr', users: 6100 },
  { month: 'May', users: 7500 },
  { month: 'Jun', users: 8750 },
];

export const engagementData = [
    { type: 'Text Messages', value: 400, fill: 'hsl(var(--chart-1))' },
    { type: 'Commands', value: 300, fill: 'hsl(var(--chart-2))' },
    { type: 'Photos', value: 150, fill: 'hsl(var(--chart-3))' },
    { type: 'Stickers', value: 100, fill: 'hsl(var(--chart-4))' },
    { type: 'Other', value: 50, fill: 'hsl(var(--chart-5))' },
];

export const commandUsageData: Trend[] = [
    { feature: "/start", usage: 1200, fill: "hsl(var(--chart-1))" },
    { feature: "/help", usage: 980, fill: "hsl(var(--chart-2))" },
    { feature: "/settings", usage: 750, fill: "hsl(var(--chart-3))" },
    { feature: "/profile", usage: 620, fill: "hsl(var(--chart-4))" },
    { feature: "/stats", usage: 400, fill: "hsl(var(--chart-5))" },
];

export const featureUsageOverTime = [
  { date: "2024-01", "Feature A": 23, "Feature B": 11 },
  { date: "2024-02", "Feature A": 27, "Feature B": 19 },
  { date: "2024-03", "Feature A": 40, "Feature B": 25 },
  { date: "2024-04", "Feature A": 35, "Feature B": 33 },
  { date: "2024-05", "Feature A": 49, "Feature B": 41 },
];
