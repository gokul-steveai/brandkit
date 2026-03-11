import { useState } from "react";
import { Plus, Trash2, X, Check, Loader2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TerminologyItem, LookupResponse, LookupStatus } from "./types";

export type { TerminologyItem };

interface PreferredTerminologyCardProps {
  terminology: TerminologyItem[];
  onAdd: (item: TerminologyItem) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, item: TerminologyItem) => void;
}

export function PreferredTerminologyCard({ terminology, onAdd, onRemove, onUpdate }: PreferredTerminologyCardProps) {
  const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(null);
  const [isAddingTerminology, setIsAddingTerminology] = useState(false);
  
  // New term input state
  const [newTerm, setNewTerm] = useState("");
  const [termSubmitted, setTermSubmitted] = useState(false);
  
  // Lookup state
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle');
  const [fetchedDefinition, setFetchedDefinition] = useState<string | null>(null);
  const [fetchedSynonyms, setFetchedSynonyms] = useState<string[]>([]);
  const [definitionSource, setDefinitionSource] = useState<'dictionary' | 'urban' | null>(null);
  const [definitionApproved, setDefinitionApproved] = useState<boolean | null>(null);
  
  // Form state after term is submitted
  const [newDescription, setNewDescription] = useState("");
  const [newInsteadOfTerms, setNewInsteadOfTerms] = useState<string[]>([]);
  
  // Hover state for definition review
  const [isHoveringDefinition, setIsHoveringDefinition] = useState(false);

  const resetForm = () => {
    setNewTerm("");
    setTermSubmitted(false);
    setLookupStatus('idle');
    setFetchedDefinition(null);
    setFetchedSynonyms([]);
    setDefinitionSource(null);
    setDefinitionApproved(null);
    setNewDescription("");
    setNewInsteadOfTerms([]);
    setIsAddingTerminology(false);
  };

  const handleSubmitTerm = async () => {
    if (!newTerm.trim()) return;
    
    setTermSubmitted(true);
    setLookupStatus('loading');
    
    try {
      const { data, error } = await supabase.functions.invoke('lookup-term', {
        body: { term: newTerm.trim() }
      });
      
      if (error) {
        console.error('Lookup error:', error);
        setLookupStatus('error');
        toast.error('Failed to look up term');
        return;
      }
      
      const result = data as LookupResponse;
      
      if (result.status === 'found' && result.definition) {
        setFetchedDefinition(result.definition);
        setFetchedSynonyms(result.synonyms);
        setDefinitionSource(result.source);
        setLookupStatus('complete');
      } else if (result.status === 'not_found') {
        setFetchedDefinition(null);
        setFetchedSynonyms([]);
        setLookupStatus('complete');
        toast.info('No definition found. You can add your own description.');
      } else {
        setLookupStatus('error');
        toast.error(result.error || 'Failed to look up term');
      }
    } catch (err) {
      console.error('Lookup error:', err);
      setLookupStatus('error');
      toast.error('Failed to look up term');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTerm.trim() && !termSubmitted) {
      e.preventDefault();
      handleSubmitTerm();
    }
  };

  const handleApproveDefinition = () => {
    if (fetchedDefinition) {
      setNewDescription(fetchedDefinition);
      setDefinitionApproved(true);
    }
  };

  const handleRejectDefinition = () => {
    setFetchedDefinition(null);
    setDefinitionApproved(false);
    setNewDescription("");
  };

  const handleAddSynonym = (synonym: string) => {
    if (!newInsteadOfTerms.includes(synonym)) {
      setNewInsteadOfTerms([...newInsteadOfTerms, synonym]);
    }
  };

  const handleRemoveSynonym = (index: number) => {
    setNewInsteadOfTerms(newInsteadOfTerms.filter((_, i) => i !== index));
  };

  const addManualInsteadOfTerm = () => {
    setNewInsteadOfTerms([...newInsteadOfTerms, ""]);
  };

  const updateInsteadOfTerm = (index: number, value: string) => {
    const updated = [...newInsteadOfTerms];
    updated[index] = value;
    setNewInsteadOfTerms(updated);
  };

  const handleAddTerminology = () => {
    if (newTerm.trim()) {
      const filteredInsteadOf = newInsteadOfTerms.filter((term) => term.trim() !== "");
      onAdd({
        term: newTerm.trim(),
        instead_of: filteredInsteadOf,
        description: newDescription.trim(),
      });
      resetForm();
    }
  };

  const handleRemove = (index: number) => {
    onRemove(index);
    if (expandedCardIndex === index) {
      setExpandedCardIndex(null);
    } else if (expandedCardIndex !== null && expandedCardIndex > index) {
      setExpandedCardIndex(expandedCardIndex - 1);
    }
  };

  const isFieldsDisabled = !termSubmitted || lookupStatus === 'loading';

  return (
    <TooltipProvider>
      <>
        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Preferred Terminology</CardTitle>
            <CardDescription>Words to use and words to avoid</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Terminology Cards Grid */}
            {terminology.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {terminology.map((item, index) => (
                  <Card
                    key={index}
                    className="group relative border-2 border-border cursor-pointer hover:border-primary/50 transition-colors h-full"
                    onClick={() => setExpandedCardIndex(index)}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(index);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                    <CardContent className="p-4 pr-10 h-full flex flex-col">
                      <p className="font-medium text-primary truncate">{item.term}</p>
                      {item.instead_of.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-muted-foreground">Instead of: </span>
                          <span className="text-xs text-destructive line-through">
                            {item.instead_of.slice(0, 2).join(", ")}
                            {item.instead_of.length > 2 && ` +${item.instead_of.length - 2} more`}
                          </span>
                        </div>
                      )}
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
                      )}
                      {(item.instead_of.length > 2 || item.description.length > 50) && (
                        <span className="text-xs text-primary mt-auto pt-2">Click to view details</span>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Add Terminology Form */}
            {isAddingTerminology ? (
              <Card className="border-2 border-primary/50">
                <CardContent className="p-4 space-y-4">
                  {/* Term Input Section */}
                  <div className="space-y-2">
                    <Label>Preferred Term</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="e.g., X-Mas" 
                        value={newTerm} 
                        onChange={(e) => setNewTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={termSubmitted}
                        className="flex-1 max-w-[50%]"
                      />
                      {!termSubmitted && (
                        <Button 
                          onClick={handleSubmitTerm} 
                          disabled={!newTerm.trim()}
                        >
                          {lookupStatus === 'loading' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Add Term'
                          )}
                        </Button>
                      )}
                      {termSubmitted && (
                        <Badge variant="outline" className="h-10 px-3 flex items-center">
                          <Check className="h-3 w-3 mr-1 text-success-foreground" />
                          Term added
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Description / Instructions Section */}
                  <div className="space-y-2">
                    <Label>Description / Instructions</Label>
                    {isFieldsDisabled ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <Textarea
                              placeholder={lookupStatus === 'loading' ? "Looking up definition..." : "Add a term first to edit this field"}
                              value=""
                              disabled
                              rows={3}
                              className="bg-disabled text-disabled-foreground cursor-not-allowed resize-none"
                            />
                            {lookupStatus === 'loading' && (
                              <div className="absolute inset-0 flex items-center justify-center bg-disabled/50">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              </div>
                            )}
                            {lookupStatus !== 'loading' && (
                              <HelpCircle className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add a term first to edit this field</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : fetchedDefinition && definitionApproved === null ? (
                      // Definition review state
                      <div 
                        className="relative"
                        onMouseEnter={() => setIsHoveringDefinition(true)}
                        onMouseLeave={() => setIsHoveringDefinition(false)}
                      >
                        <Textarea
                          value={fetchedDefinition}
                          disabled
                          rows={3}
                          className="bg-warning/30 text-foreground border-warning resize-none pr-16"
                        />
                        <div className="absolute top-1 right-1">
                          <Badge variant="outline" className="text-xs bg-background">
                            {definitionSource === 'urban' ? 'Urban Dictionary' : 'Dictionary'}
                          </Badge>
                        </div>
                        {isHoveringDefinition && (
                          <div className="absolute bottom-2 right-2 flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 bg-success hover:bg-success/80"
                              onClick={handleApproveDefinition}
                            >
                              <Check className="h-4 w-4 text-success-foreground" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 bg-destructive hover:bg-destructive/80"
                              onClick={handleRejectDefinition}
                            >
                              <Trash2 className="h-4 w-4 text-destructive-foreground" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Editable state (after approval or no definition found)
                      <Textarea
                        placeholder="Provide context and nuance for using this term..."
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        rows={3}
                      />
                    )}
                  </div>

                  {/* Instead Of Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Instead of</Label>
                      {!isFieldsDisabled && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={addManualInsteadOfTerm}
                          className="text-negative-foreground/80 border border-negative-foreground/80 hover:text-negative-foreground hover:border-negative-foreground/60 hover:bg-negative"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Term To Avoid
                        </Button>
                      )}
                    </div>
                    
                    {isFieldsDisabled ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <Input
                              placeholder={lookupStatus === 'loading' ? "Finding synonyms..." : "Add a term first to edit this field"}
                              disabled
                              className="bg-disabled text-disabled-foreground cursor-not-allowed"
                            />
                            {lookupStatus === 'loading' && (
                              <div className="absolute inset-0 flex items-center justify-center bg-disabled/50">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              </div>
                            )}
                            {lookupStatus !== 'loading' && (
                              <HelpCircle className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add a term first to edit this field</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <>
                        {/* Terms to avoid input fields */}
                        <div className="space-y-2">
                          {newInsteadOfTerms.map((term, idx) => (
                            <div key={idx} className="flex gap-2">
                              <Input
                                placeholder="e.g., Christmas"
                                value={term}
                                onChange={(e) => updateInsteadOfTerm(idx, e.target.value)}
                              />
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveSynonym(idx)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {/* Synonym suggestions */}
                        {fetchedSynonyms.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <p className="text-xs text-muted-foreground">
                              Suggested synonyms (click to add as terms to avoid):
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {fetchedSynonyms
                                .filter(s => !newInsteadOfTerms.includes(s))
                                .map((synonym, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="cursor-pointer hover:bg-negative hover:text-negative-foreground transition-colors"
                                    onClick={() => handleAddSynonym(synonym)}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    {synonym}
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={handleAddTerminology} 
                      disabled={!termSubmitted || lookupStatus === 'loading'}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Terminology
                    </Button>
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button variant="outline" onClick={() => setIsAddingTerminology(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Terminology
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Expanded Card Dialog */}
        <Dialog open={expandedCardIndex !== null} onOpenChange={(open) => !open && setExpandedCardIndex(null)}>
          <DialogContent className="max-w-2xl">
            {expandedCardIndex !== null && terminology[expandedCardIndex] && (
              <>
                <DialogHeader>
                  <DialogTitle>{terminology[expandedCardIndex]?.term}</DialogTitle>
                  <DialogDescription>View and edit terminology details</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Preferred Term</Label>
                    <Input
                      value={terminology[expandedCardIndex]?.term || ""}
                      onChange={(e) => {
                        const updated = {
                          ...terminology[expandedCardIndex],
                          term: e.target.value,
                        };
                        onUpdate(expandedCardIndex, updated);
                      }}
                    />
                  </div>
                  <div>
                    <Label>Description / Instructions</Label>
                    <Textarea
                      value={terminology[expandedCardIndex]?.description || ""}
                      onChange={(e) => {
                        const updated = {
                          ...terminology[expandedCardIndex],
                          description: e.target.value,
                        };
                        onUpdate(expandedCardIndex, updated);
                      }}
                      rows={4}
                      placeholder="Provide context and nuance for using this term..."
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Instead of</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updated = {
                            ...terminology[expandedCardIndex],
                            instead_of: [...terminology[expandedCardIndex].instead_of, ""],
                          };
                          onUpdate(expandedCardIndex, updated);
                        }}
                        className="text-negative-foreground/50 border border-negative-foreground/30 hover:text-negative-foreground/80 hover:border-negative-foreground/60 hover:bg-negative"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Term To Avoid
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {terminology[expandedCardIndex]?.instead_of.map((term, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            placeholder="e.g., Christmas"
                            value={term}
                            onChange={(e) => {
                              const updated = {
                                ...terminology[expandedCardIndex],
                                instead_of: terminology[expandedCardIndex].instead_of.map((t, i) =>
                                  i === idx ? e.target.value : t,
                                ),
                              };
                              onUpdate(expandedCardIndex, updated);
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated = {
                                ...terminology[expandedCardIndex],
                                instead_of: terminology[expandedCardIndex].instead_of.filter((_, i) => i !== idx),
                              };
                              onUpdate(expandedCardIndex, updated);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {terminology[expandedCardIndex]?.instead_of.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No terms to avoid yet. Click "Add Term" to add one.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  );
}
