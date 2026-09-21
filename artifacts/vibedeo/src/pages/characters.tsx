import * as React from 'react';
import { useState } from 'react';
import { useListCharacters, useCreateCharacter, useDeleteCharacter, useUpdateCharacter } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, User, Trash2, Edit2, Shield, UserCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-xl", className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));

export function Characters() {
  const queryClient = useQueryClient();
  const { data: characters, isLoading } = useListCharacters();
  const createChar = useCreateCharacter();
  const deleteChar = useDeleteCharacter();
  const updateChar = useUpdateCharacter();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState<any>('realistic');

  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setDescription('');
    setStyle('realistic');
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (char: any) => {
    setName(char.name);
    setDescription(char.sourceDescription || '');
    setStyle(char.style);
    setEditingId(char.id);
    setIsCreateOpen(true);
  };

  const handleSubmit = () => {
    if (name.length < 2 || description.length < 8) {
      toast.error('Please provide a valid name and detailed description.');
      return;
    }

    if (editingId) {
      updateChar.mutate({
        id: editingId,
        data: { name, sourceDescription: description, style }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/characters'] });
          setIsCreateOpen(false);
          toast.success('Character updated successfully!');
        }
      });
    } else {
      createChar.mutate({
        data: { name, sourceDescription: description, style }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/characters'] });
          setIsCreateOpen(false);
          toast.success('Character created successfully!');
        }
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this character?')) {
      deleteChar.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/characters'] });
          toast.success('Character deleted');
        }
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Character Library</h1>
          <p className="text-muted-foreground mt-1">Create reusable personas for consistent video generations.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-xl" onClick={handleOpenCreate}>
              <Plus className="w-5 h-5 mr-2" />
              New Character
            </Button>
          </DialogTrigger>
          <DialogContent>
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-display font-bold">{editingId ? 'Edit Character' : 'Create Character'}</h2>
                <p className="text-sm text-muted-foreground mt-1">Define physical traits to keep appearance consistent across videos.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Character Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="E.g. Cyberpunk Detective Kael" />
                </div>
                <div className="space-y-2">
                  <Label>Primary Style</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realistic">Realistic</SelectItem>
                      <SelectItem value="pixar_3d">3D Animation</SelectItem>
                      <SelectItem value="anime">Anime</SelectItem>
                      <SelectItem value="claymation">Claymation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Appearance Description</Label>
                  <Textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe their exact appearance: hair color, facial features, typical clothing, distinguishing marks..."
                    className="h-32 resize-none"
                  />
                  <p className="text-xs text-muted-foreground">This description will be locked and injected into future prompts.</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createChar.isPending || updateChar.isPending}>
                  {(createChar.isPending || updateChar.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create Character'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : characters?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed">
          <div className="rounded-full bg-secondary p-4 mb-4">
            <UserCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-lg">No characters yet</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">Build your cast of actors. Saved characters ensure consistent faces across multiple generations.</p>
          <Button onClick={handleOpenCreate}>Create your first character</Button>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {characters?.map((char) => (
            <Card key={char.id} className="relative overflow-hidden group">
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-xl line-clamp-1">{char.name}</CardTitle>
                  <CardDescription className="capitalize mt-1">{char.style.replace('_', ' ')}</CardDescription>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full text-primary shrink-0">
                  <User size={24} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-md min-h-[80px] line-clamp-3 relative">
                  <Shield size={14} className="absolute right-2 top-2 text-primary/40" />
                  {char.sourceDescription || char.lockedDescription}
                </div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Used in {char.usageCount} videos</span>
                  <span>Created {new Date(char.createdAt).toLocaleDateString()}</span>
                </div>
                
                <div className="pt-4 border-t flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenEdit(char)}>
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </Button>
                  <Button variant="destructive" size="icon" className="shrink-0" onClick={() => handleDelete(char.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
