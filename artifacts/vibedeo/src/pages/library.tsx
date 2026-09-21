import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useListGenerations, useCreateGenerationShare } from '@workspace/api-client-react';
import { Search, Download, Share2, PlayCircle, ExternalLink, Clapperboard } from 'lucide-react';
import { toast } from 'sonner';

export function Library() {
  const [search, setSearch] = useState('');
  const { data: generations, isLoading } = useListGenerations();
  const shareMutation = useCreateGenerationShare();

  const filtered = generations?.filter(gen => 
    gen.prompt.toLowerCase().includes(search.toLowerCase()) || 
    gen.style.toLowerCase().includes(search.toLowerCase())
  );

  const handleShare = (id: string) => {
    shareMutation.mutate({ id }, {
      onSuccess: (data) => {
        navigator.clipboard.writeText(data.url);
        toast.success('Share link copied to clipboard!');
      },
      onError: () => toast.error('Failed to create share link')
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Library</h1>
          <p className="text-muted-foreground mt-1">All your generated masterpieces in one place.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search generations..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-video w-full rounded-none" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-8 w-full mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed">
          <div className="rounded-full bg-secondary p-4 mb-4">
            <Clapperboard className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-lg">No results found</h3>
          <p className="text-muted-foreground mb-4">Try a different search term or create a new video.</p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered?.map((gen) => (
            <Card key={gen.id} className="overflow-hidden flex flex-col group">
              <div className="aspect-video bg-muted relative border-b">
                {gen.thumbnailUrl ? (
                  <img src={gen.thumbnailUrl} alt={gen.prompt} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
                    <PlayCircle className="h-10 w-10 text-muted-foreground/30" />
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
                {gen.status === 'completed' && gen.outputUrl && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                    <Button size="icon" variant="secondary" className="rounded-full" asChild>
                      <a href={gen.outputUrl} target="_blank" rel="noreferrer">
                        <ExternalLink size={18} />
                      </a>
                    </Button>
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="rounded-full"
                      onClick={() => handleShare(gen.id)}
                      disabled={shareMutation.isPending}
                    >
                      <Share2 size={18} />
                    </Button>
                  </div>
                )}
              </div>
              <CardContent className="p-4 flex flex-col flex-1">
                <p className="text-sm font-medium line-clamp-2 leading-relaxed flex-1" title={gen.prompt}>
                  {gen.prompt}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0.5">
                      {gen.style.replace('_', ' ')}
                    </Badge>
                    <span>{gen.aspectRatio}</span>
                  </div>
                  <span>{new Date(gen.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
