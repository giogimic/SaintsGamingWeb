"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteNewsArticle } from "@/app/admin/news/actions";

export function DeleteArticleButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this article? This action cannot be undone.")) {
      startTransition(async () => {
        await deleteNewsArticle(id);
      });
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleDelete}
      disabled={isPending}
      title="Delete Article"
    >
      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-400" />
    </Button>
  );
}
