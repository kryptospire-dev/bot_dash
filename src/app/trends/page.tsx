import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { commandUsageData, featureUsageOverTime } from "@/lib/data";
import { TrendCharts } from "./charts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb } from "lucide-react";

export default function TrendsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Content Trends</h2>
        <p className="text-muted-foreground">
          Analyze which features and content generate the most engagement.
        </p>
      </div>

      <Alert>
        <Lightbulb className="h-4 w-4" />
        <AlertTitle>AI-Powered Insights</AlertTitle>
        <AlertDescription>
          Trends are currently based on sample data. Connect your AI flow to get real-time insights on user engagement patterns.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-7 lg:gap-8">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Most Used Commands</CardTitle>
            <CardDescription>
              Usage frequency of the most popular bot commands.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <TrendCharts chartType="bar" data={commandUsageData} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Feature Usage Over Time</CardTitle>
            <CardDescription>
              Monthly engagement trends for key features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrendCharts chartType="line" data={featureUsageOverTime} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
