import { useState, useEffect } from 'react';
import { format, subDays, subHours } from 'date-fns';
import { Activity, CheckCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, BarChart, Bar, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

type TimeRange = '24h' | '7d' | '30d';

interface RequestLog {
  id: string;
  method: string;
  tool_name: string | null;
  request_status: string;
  response_time_ms: number | null;
  created_at: string;
  api_key_id: string | null;
}

interface ApiKey {
  id: string;
  name: string;
}

export function ApiKeyAnalytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = getStartDate(timeRange);

      const [logsResult, keysResult] = await Promise.all([
        supabase
          .from('mcp_request_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('api_keys')
          .select('id, name')
          .eq('user_id', user.id),
      ]);

      if (logsResult.data) setLogs(logsResult.data);
      if (keysResult.data) setApiKeys(keysResult.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStartDate = (range: TimeRange): Date => {
    switch (range) {
      case '24h':
        return subHours(new Date(), 24);
      case '7d':
        return subDays(new Date(), 7);
      case '30d':
        return subDays(new Date(), 30);
    }
  };

  // Calculate stats
  const totalRequests = logs.length;
  const successfulRequests = logs.filter(l => l.request_status === 'success').length;
  const successRate = totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 0;
  const avgResponseTime = logs.length > 0
    ? Math.round(logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / logs.length)
    : 0;
  const errorCount = logs.filter(l => l.request_status === 'error').length;

  // Prepare chart data - requests over time
  const requestsOverTime = prepareTimeSeriesData(logs, timeRange);

  // Prepare tool usage data
  const toolUsage = logs
    .filter(l => l.tool_name)
    .reduce((acc, l) => {
      const tool = l.tool_name!;
      acc[tool] = (acc[tool] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const toolChartData = Object.entries(toolUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name: name.replace('get_', '').replace('_', ' '), count }));

  // Prepare API key usage data
  const keyUsage = logs.reduce((acc, l) => {
    if (l.api_key_id) {
      acc[l.api_key_id] = (acc[l.api_key_id] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const keyChartData = Object.entries(keyUsage)
    .map(([keyId, count]) => {
      const key = apiKeys.find(k => k.id === keyId);
      return { name: key?.name || 'Unknown', count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const getKeyName = (keyId: string | null) => {
    if (!keyId) return 'Unknown';
    const key = apiKeys.find(k => k.id === keyId);
    return key?.name || 'Deleted key';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Usage Analytics</h3>
        <Select value={timeRange} onValueChange={(v: TimeRange) => setTimeRange(v)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime}ms</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {totalRequests > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Requests Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  requests: { label: 'Requests', color: 'hsl(var(--primary))' },
                }}
                className="h-[200px]"
              >
                <LineChart data={requestsOverTime}>
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Most Used Tools</CardTitle>
            </CardHeader>
            <CardContent>
              {toolChartData.length > 0 ? (
                <ChartContainer
                  config={{
                    count: { label: 'Requests', color: 'hsl(var(--primary))' },
                  }}
                  className="h-[200px]"
                >
                  <BarChart data={toolChartData} layout="vertical">
                    <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" fontSize={12} tickLine={false} axisLine={false} width={100} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={4} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No tool usage data</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          <CardDescription>Last 10 requests</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Response Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.slice(0, 10).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(log.created_at), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell>{getKeyName(log.api_key_id)}</TableCell>
                    <TableCell>
                      {log.tool_name || log.method}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.request_status === 'success' ? 'default' : 'destructive'}>
                        {log.request_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {log.response_time_ms ? `${log.response_time_ms}ms` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No requests recorded yet. Start using your API keys to see analytics.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function prepareTimeSeriesData(logs: RequestLog[], timeRange: TimeRange) {
  const now = new Date();
  const data: { date: string; requests: number }[] = [];

  if (timeRange === '24h') {
    // Hourly buckets for last 24 hours
    for (let i = 23; i >= 0; i--) {
      const hour = subHours(now, i);
      const hourStr = format(hour, 'HH:00');
      const count = logs.filter(l => {
        const logDate = new Date(l.created_at);
        return format(logDate, 'yyyy-MM-dd HH') === format(hour, 'yyyy-MM-dd HH');
      }).length;
      data.push({ date: hourStr, requests: count });
    }
  } else {
    // Daily buckets
    const days = timeRange === '7d' ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const day = subDays(now, i);
      const dayStr = format(day, 'MMM d');
      const count = logs.filter(l => {
        const logDate = new Date(l.created_at);
        return format(logDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      }).length;
      data.push({ date: dayStr, requests: count });
    }
  }

  return data;
}
