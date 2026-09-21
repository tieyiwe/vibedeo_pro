import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { getGetGenerationQueryKey, useCreateGeneration, useEnhancePrompt, useListCharacters, useGetGeneration } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Wand2, Image as ImageIcon, Video, Loader2, Sparkles, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export function Create() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<any>('realistic');
  const [aspectRatio, setAspectRatio] = useState<any>('16:9');
  const [duration, setDuration] = useState<any>('4');
  const [resolution, setResolution] = useState<any>('standard');
  const [characterId, setCharacterId] = useState<string>('none');
  
  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(null);
  
  const { data: characters } = useListCharacters();
  const createGen = useCreateGeneration();
  const enhancePrompt = useEnhancePrompt();
  
  const { data: generationState, refetch: refetchGeneration } = useGetGeneration(
    activeGenerationId!, 
    { query: { enabled: !!activeGenerationId, queryKey: getGetGenerationQueryKey(activeGenerationId!), refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'processing' || status === 'queued' ? 2000 : false;
    } } }
  );

  const handleEnhance = () => {
    if (prompt.length < 8) {
      toast.error('Prompt must be at least 8 characters to enhance.');
      return;
    }
    enhancePrompt.mutate({ data: { prompt, style, characterId: characterId !== 'none' ? characterId : null } }, {
      onSuccess: (data) => {
        setPrompt(data.enhancedPrompt);
        toast.success('Prompt enhanced magically!');
      },
      onError: () => toast.error('Failed to enhance prompt')
    });
  };

  const handleGenerate = () => {
    if (prompt.length < 8) {
      toast.error('Prompt must be at least 8 characters.');
      return;
    }
    
    createGen.mutate({
      data: {
        prompt,
        type: 'text_to_video',
        style,
        aspectRatio,
        durationSeconds: Number(duration) as any,
        resolution,
        characterId: characterId !== 'none' ? characterId : null,
      }
    }, {
      onSuccess: (data) => {
        setActiveGenerationId(data.id);
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/generations'] });
        toast.success('Generation started!');
      },
      onError: () => toast.error('Failed to start generation')
    });
  };

  useEffect(() => {
    if (generationState?.status === 'completed') {
      toast.success('Video generated successfully!');
    } else if (generationState?.status === 'failed') {
      toast.error('Generation failed: ' + (generationState.errorMessage || 'Unknown error'));
      setActiveGenerationId(null);
    }
  }, [generationState?.status]);

  if (activeGenerationId && generationState) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold">
            {generationState.status === 'completed' ? 'Your Masterpiece is Ready' : 'Crafting Video...'}
          </h1>
          <p className="text-muted-foreground line-clamp-1 max-w-lg mx-auto">{generationState.prompt}</p>
        </div>

        <Card className="overflow-hidden border-2 border-primary/20">
          <div className="aspect-video bg-black relative flex items-center justify-center">
            {generationState.outputUrl ? (
              <video 
                src={generationState.outputUrl} 
                controls 
                autoPlay 
                className="w-full h-full object-contain"
              />
            ) : generationState.thumbnailUrl ? (
               <img src={generationState.thumbnailUrl} className="w-full h-full object-cover opacity-50 blur-sm" />
            ) : (
              <Video className="w-16 h-16 text-muted-foreground/30 animate-pulse" />
            )}
            
            {(generationState.status === 'processing' || generationState.status === 'queued') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white space-y-4 p-12">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="text-center w-full max-w-sm space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="capitalize">{generationState.status}</span>
                    <span>{generationState.progress}%</span>
                  </div>
                  <Progress value={generationState.progress} className="h-2 bg-white/20 [&>div]:bg-primary" />
                </div>
              </div>
            )}
          </div>
          
          <CardContent className="p-6 bg-secondary/30">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Style</p>
                <p className="font-semibold capitalize">{generationState.style.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Format</p>
                <p className="font-semibold">{generationState.aspectRatio} • {generationState.durationSeconds}s</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Resolution</p>
                <p className="font-semibold capitalize">{generationState.resolution}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Cost</p>
                <p className="font-semibold text-primary">{generationState.creditsUsed} Credits</p>
              </div>
            </div>
            
            {generationState.status === 'completed' && (
              <div className="mt-8 flex gap-4">
                <Button className="flex-1" onClick={() => setActiveGenerationId(null)}>
                  Create Another
                </Button>
                <Button variant="secondary" className="flex-1" asChild>
                  <a href={generationState.outputUrl || '#'} target="_blank" download>Download Video</a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Create Video</h1>
        <p className="text-muted-foreground mt-1">Transform your imagination into motion.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-8">
        <Card className="shadow-md">
          <CardContent className="p-6 space-y-6">
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
                <TabsTrigger value="text" className="text-base h-full">Text to Video</TabsTrigger>
                <TabsTrigger value="image" className="text-base h-full flex items-center gap-2" disabled>
                  <ImageIcon size={16} /> Image to Video <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded ml-1">Soon</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="text" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">Prompt</Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                      onClick={handleEnhance}
                      disabled={enhancePrompt.isPending}
                    >
                      {enhancePrompt.isPending ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Sparkles className="w-3 h-3 mr-2" />}
                      Enhance Prompt
                    </Button>
                  </div>
                  <Textarea 
                    placeholder="Describe your scene in detail. E.g., A cinematic wide shot of a neon-lit cyberpunk city in the rain, flying cars overhead..." 
                    className="min-h-[160px] text-base resize-none bg-secondary/20"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <span className="text-xs text-muted-foreground">{prompt.length} chars</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Style</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realistic">Cinematic Realistic</SelectItem>
                    <SelectItem value="pixar_3d">3D Animation (Pixar)</SelectItem>
                    <SelectItem value="anime">Anime / 2D</SelectItem>
                    <SelectItem value="claymation">Claymation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 Landscape</SelectItem>
                    <SelectItem value="9:16">9:16 Portrait</SelectItem>
                    <SelectItem value="1:1">1:1 Square</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 Seconds</SelectItem>
                    <SelectItem value="6">6 Seconds</SelectItem>
                    <SelectItem value="8">8 Seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Resolution</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (720p)</SelectItem>
                    <SelectItem value="high">High (1080p)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {characters && characters.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <Label className="flex items-center gap-2">
                    <UserCircle size={16} /> 
                    Cast Character
                  </Label>
                  <Select value={characterId} onValueChange={setCharacterId}>
                    <SelectTrigger className="bg-primary/5 border-primary/20">
                      <SelectValue placeholder="Select character" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Anonymous)</SelectItem>
                      {characters.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Button 
            className="w-full h-14 text-lg font-semibold rounded-xl shadow-lg hover:shadow-primary/25 transition-all" 
            onClick={handleGenerate}
            disabled={createGen.isPending || prompt.length < 8}
          >
            {createGen.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Wand2 className="w-5 h-5 mr-2" />}
            Generate Video
          </Button>
          
          <div className="text-center text-xs text-muted-foreground">
            Estimated cost: <strong className="text-foreground">{resolution === 'high' ? '20' : '10'} Credits</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
