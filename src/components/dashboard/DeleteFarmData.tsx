
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Database, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteFarmDataProps {
  farmId: string | null;
  userId: string;
  onDeleted: () => void;
}

const DeleteFarmData = ({ farmId, userId, onDeleted }: DeleteFarmDataProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteFarmData = async () => {
    if (!farmId) return;
    
    try {
      setIsDeleting(true);
      
      // Töröljük a kultúra adatokat
      const { error: culturesError } = await supabase
        .from('cultures')
        .delete()
        .eq('farm_id', farmId);
        
      if (culturesError) throw culturesError;
      
      // Töröljük a farm részleteit
      const { error: farmDetailsError } = await supabase
        .from('farm_details')
        .delete()
        .eq('farm_id', farmId);
        
      if (farmDetailsError) throw farmDetailsError;
      
      // Töröljük a farm adatokat
      const { error: farmError } = await supabase
        .from('farms')
        .delete()
        .eq('id', farmId)
        .eq('user_id', userId);
        
      if (farmError) throw farmError;
      
      toast.success("A gazdaság adatai sikeresen törölve lettek");
      onDeleted();
    } catch (error) {
      console.error("Hiba a gazdaság törlésekor:", error);
      toast.error("Hiba történt a gazdaság törlésekor");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="flex items-center gap-1">
          <Trash2 className="h-4 w-4" />
          Gazdaság törlése
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Gazdaság adatainak törlése</AlertDialogTitle>
          <AlertDialogDescription>
            Biztosan törölni szeretné a gazdaság összes adatát? Ez a művelet nem vonható vissza, és az összes feltöltött dokumentum és adat elvész.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Mégsem</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteFarmData}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                Törlés...
              </>
            ) : (
              "Törlés"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteFarmData;
