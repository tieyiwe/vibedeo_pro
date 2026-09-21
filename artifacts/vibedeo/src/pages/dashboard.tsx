import { useGetDashboardSummary } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Video, Sparkles, CheckCircle, Clock, PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function Dashboard() {
  const { data: summary, isLoading, isError } = useGetDashboardSummary();

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <CheckCircle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Failed to load dashboard</h2>
          <p className="text-muted-foreground mt-1">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Studio Overview</h1>
          <p className="text-muted-foreground mt-1">Manage your video generations and characters.</p>
        </div>
        <Button asChild size="lg" className="rounded-xl">
          <Link href="/create" className="flex items-center gap-2">
            <Sparkles size={18} />
            Create Video
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Credits Remaining</CardTitle>
            <Sparkles className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{summary.credits}</div>
            <p className="text-xs text-muted-foreground mt-1">Available for generation</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{summary.totalGenerations}</div>
            <p className="text-xs text-muted-foreground mt-1">Generated all-time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{summary.processingGenerations}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently rendering</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Characters</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{summary.savedCharacters}</div>
            <p className="text-xs text-muted-foreground mt-1">Reusable personas</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold">Recent Generations</h2>
          <Button variant="ghost" asChild>
            <Link href="/library">View all</Link>
          </Button>
        </div>
        
        {summary.recentGenerations.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
            <div className="rounded-full bg-secondary p-4 mb-4">
              <PlayCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-lg">No videos yet</h3>
            <p className="text-muted-foreground mb-4">Your creative journey starts here.</p>
            <Button asChild variant="secondary">
              <Link href="/create">Generate your first video</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {summary.recentGenerations.map((gen) => (
              <Card key={gen.id} className="overflow-hidden group hover:shadow-md transition-all">
                <div className="aspect-video bg-muted relative">
                  {gen.thumbnailUrl ? (
                    <img src={gen.thumbnailUrl} alt={gen.prompt} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Badge variant={
                      gen.status === 'completed' ? 'default' : 
                      gen.status === 'failed' ? 'destructive' : 'secondary'
                    }>
                      {gen.status}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className="text-sm font-medium line-clamp-2 leading-snug" title={gen.prompt}>
                    {gen.prompt}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="capitalize">{gen.style.replace('_', ' ')}</span>
                    <span>{new Date(gen.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
