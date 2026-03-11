import { useState, useEffect } from 'react';
import { Copy, Check, ChevronDown, Plus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useToast';

interface Persona {
  id: string;
  name: string;
  purpose_type: string;
  role_definition: string | null;
  function_description: string | null;
  personality_description: string | null;
  is_default: boolean;
  is_active: boolean;
  tasks: string[];
  behavioral_rules: string[];
  tone_overrides: Record<string, unknown> | null;
}

interface ViewPersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persona: Persona | null;
  onPersonaUpdated: () => void;
}

const PURPOSE_OPTIONS = [
  { value: 'content_creation', label: 'Content Creation' },
  { value: 'customer_support', label: 'Customer Support' },
  { value: 'internal_assistant', label: 'Internal Assistant' },
  { value: 'creative_brainstorming', label: 'Creative Brainstorming' },
  { value: 'custom', label: 'Custom' },
];

export function ViewPersonaDialog({
  open,
  onOpenChange,
  persona,
  onPersonaUpdated,
}: ViewPersonaDialogProps) {
  const [name, setName] = useState('');
  const [purposeType, setPurposeType] = useState('');
  const [roleDefinition, setRoleDefinition] = useState('');
  const [functionDescription, setFunctionDescription] = useState('');
  const [tasks, setTasks] = useState<string[]>([]);
  const [behavioralRules, setBehavioralRules] = useState<string[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newRule, setNewRule] = useState('');
  const [isXmlOpen, setIsXmlOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (persona) {
      setName(persona.name || '');
      setPurposeType(persona.purpose_type || '');
      setRoleDefinition(persona.role_definition || '');
      setFunctionDescription(persona.function_description || '');
      setTasks(Array.isArray(persona.tasks) ? persona.tasks : []);
      setBehavioralRules(Array.isArray(persona.behavioral_rules) ? persona.behavioral_rules : []);
    }
  }, [persona]);

  const handleSave = async () => {
    if (!persona) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('brand_kit_personas')
      .update({
        name,
        purpose_type: purposeType,
        role_definition: roleDefinition || null,
        function_description: functionDescription || null,
        tasks,
        behavioral_rules: behavioralRules,
      })
      .eq('id', persona.id);

    setIsSaving(false);

    if (error) {
      toast({ title: 'Failed to save changes', variant: 'destructive' });
    } else {
      toast({ title: 'Persona updated successfully' });
      onPersonaUpdated();
      onOpenChange(false);
    }
  };

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, newTask.trim()]);
      setNewTask('');
    }
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const addRule = () => {
    if (newRule.trim()) {
      setBehavioralRules([...behavioralRules, newRule.trim()]);
      setNewRule('');
    }
  };

  const removeRule = (index: number) => {
    setBehavioralRules(behavioralRules.filter((_, i) => i !== index));
  };

  const copyXml = () => {
    if (persona?.personality_description) {
      navigator.clipboard.writeText(persona.personality_description);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!persona) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Persona</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] -mx-6 px-6">
          <div className="space-y-5 pb-4">
            {/* Name and Purpose */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Persona name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose Type</Label>
                  <Select value={purposeType} onValueChange={setPurposeType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      {PURPOSE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Role Definition */}
              <div className="space-y-2">
                <Label htmlFor="role">Role Definition</Label>
                <Textarea
                  id="role"
                  value={roleDefinition}
                  onChange={(e) => setRoleDefinition(e.target.value)}
                  placeholder="Define the role this persona takes on..."
                  rows={3}
                />
              </div>

              {/* Prime Directive / Function Description */}
              <div className="space-y-2">
                <Label htmlFor="function">Prime Directive</Label>
                <Textarea
                  id="function"
                  value={functionDescription}
                  onChange={(e) => setFunctionDescription(e.target.value)}
                  placeholder="The primary objective and function of this persona..."
                  rows={3}
                />
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tasks ({tasks.length})</Label>
                </div>
                <div className="space-y-2">
                  {tasks.map((task, index) => (
                    <div key={index} className="flex items-center gap-2 group">
                      <Badge variant="secondary" className="flex-1 justify-between py-1.5 px-3 text-sm font-normal whitespace-normal">
                        <span className="break-words">{task}</span>
                        <button
                          onClick={() => removeTask(index)}
                          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      placeholder="Add a task..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
                    />
                    <Button type="button" size="icon" variant="outline" onClick={addTask}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Behavioral Rules */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Behavioral Rules ({behavioralRules.length})</Label>
                </div>
                <div className="space-y-2">
                  {behavioralRules.map((rule, index) => (
                    <div key={index} className="flex items-center gap-2 group">
                      <Badge variant="secondary" className="flex-1 justify-between py-1.5 px-3 text-sm font-normal whitespace-normal">
                        <span className="break-words">{rule}</span>
                        <button
                          onClick={() => removeRule(index)}
                          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newRule}
                      onChange={(e) => setNewRule(e.target.value)}
                      placeholder="Add a behavioral rule..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRule())}
                    />
                    <Button type="button" size="icon" variant="outline" onClick={addRule}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Collapsible XML Section */}
              {persona.personality_description && (
                <Collapsible open={isXmlOpen} onOpenChange={setIsXmlOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                      <span className="text-sm text-muted-foreground">Advanced: View Raw XML</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isXmlOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="relative mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 h-8"
                        onClick={copyXml}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <ScrollArea className="h-[150px] rounded-md border bg-muted/50 p-4">
                        <pre className="text-xs whitespace-pre-wrap font-mono">
                          {persona.personality_description}
                        </pre>
                      </ScrollArea>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
