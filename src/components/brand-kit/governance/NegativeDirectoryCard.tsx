import { Plus, Trash2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface NegativeDirectoryCardProps {
  items: string[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export function NegativeDirectoryCard({
  items,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
}: NegativeDirectoryCardProps) {
  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Ban className="h-5 w-5" />
          Negative Directory
        </CardTitle>
        <CardDescription>
          Things the brand should never do or say. Includes banned keywords, jargon and anti-patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 p-2 bg-muted border-2 border-border">
            <span className="flex-1 text-sm">{item}</span>
            <Button variant="ghost" size="icon" onClick={() => onRemove(index)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="e.g., Never make unsubstantiated claims"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAdd())}
          />
          <Button onClick={onAdd} disabled={!inputValue.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
