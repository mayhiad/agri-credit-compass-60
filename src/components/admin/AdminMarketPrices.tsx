
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Calendar, ChartLine, ChartBar, Database } from "lucide-react";

type MarketPrice = {
  id: string;
  culture: string;
  price: number;
  average_yield: number;
  region: string;
  year: string;
  is_forecast: boolean;
  trend: number;
  last_updated: string;
};

type MarketPriceFormValues = {
  culture: string;
  price: number;
  average_yield: number;
  region: string;
  year: string;
  is_forecast: boolean;
};

const AdminMarketPrices = () => {
  const [activeTab, setActiveTab] = useState<'historical' | 'forecast'>('historical');
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<MarketPriceFormValues>({
    defaultValues: {
      culture: "",
      price: 0,
      average_yield: 0,
      region: "Közép-Európa",
      year: new Date().getFullYear().toString(),
      is_forecast: false
    }
  });

  const { data: marketPrices, isLoading, error, refetch } = useQuery({
    queryKey: ['market-prices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_prices')
        .select('*')
        .order('year', { ascending: false });
      
      if (error) throw error;
      return data as MarketPrice[];
    }
  });

  const handleSubmit = async (values: MarketPriceFormValues) => {
    try {
      if (editingId) {
        // Update existing price
        const { error } = await supabase
          .from('market_prices')
          .update({
            culture: values.culture,
            price: values.price,
            average_yield: values.average_yield,
            region: values.region,
            year: values.year,
            is_forecast: values.is_forecast,
            last_updated: new Date().toISOString()
          })
          .eq('id', editingId);
        
        if (error) throw error;
        toast.success("Az árfolyam adatok frissítve");
      } else {
        // Create new price
        const { error } = await supabase
          .from('market_prices')
          .insert({
            culture: values.culture,
            price: values.price,
            average_yield: values.average_yield,
            region: values.region,
            year: values.year,
            is_forecast: values.is_forecast,
            trend: 0,
            last_updated: new Date().toISOString()
          });
        
        if (error) throw error;
        toast.success("Új árfolyam adat létrehozva");
      }
      
      // Reset form and refetch data
      form.reset();
      setEditingId(null);
      refetch();
    } catch (error) {
      console.error("Error saving market price:", error);
      toast.error("Hiba történt a mentés során");
    }
  };

  const handleEdit = (price: MarketPrice) => {
    form.reset({
      culture: price.culture,
      price: price.price,
      average_yield: price.average_yield,
      region: price.region,
      year: price.year,
      is_forecast: price.is_forecast
    });
    setEditingId(price.id);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('market_prices')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success("Árfolyam adat törölve");
      refetch();
    } catch (error) {
      console.error("Error deleting market price:", error);
      toast.error("Hiba történt a törlés során");
    }
  };

  const handleCancel = () => {
    form.reset();
    setEditingId(null);
  };

  if (error) {
    return <div className="p-4 text-red-500">Hiba történt az adatok betöltése során: {error.message}</div>;
  }

  const filteredPrices = marketPrices?.filter(price => 
    activeTab === 'historical' ? !price.is_forecast : price.is_forecast
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 mb-4">
        <Button
          variant={activeTab === 'historical' ? 'default' : 'outline'}
          onClick={() => setActiveTab('historical')}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Historikus árak
        </Button>
        <Button
          variant={activeTab === 'forecast' ? 'default' : 'outline'}
          onClick={() => setActiveTab('forecast')}
        >
          <ChartLine className="mr-2 h-4 w-4" />
          Piaci előrejelzések
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Árfolyam módosítása" : "Új árfolyam hozzáadása"}</CardTitle>
          <CardDescription>
            {activeTab === 'historical' 
              ? "Historikus termény árak és termésátlagok rögzítése" 
              : "Aktuális piaci előrejelzések rögzítése"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="culture"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kultúra</FormLabel>
                    <FormControl>
                      <Input placeholder="pl. Búza" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ár (Ft/t)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} 
                        value={field.value}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="average_yield"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Átlagos termésátlag (t/ha)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} 
                        value={field.value}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Régió</FormLabel>
                    <FormControl>
                      <Input placeholder="pl. Közép-Európa" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Év</FormLabel>
                    <FormControl>
                      <Input placeholder="2023" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_forecast"
                render={({ field }) => (
                  <FormItem className="flex items-end space-x-2">
                    <FormControl>
                      <input 
                        type="checkbox" 
                        checked={field.value} 
                        onChange={(e) => {
                          field.onChange(e.target.checked);
                          if (e.target.checked) {
                            setActiveTab('forecast');
                          } else {
                            setActiveTab('historical');
                          }
                        }}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <FormLabel className="ml-2">Előrejelzés</FormLabel>
                  </FormItem>
                )}
              />
              <div className="col-span-2 flex justify-end space-x-2">
                {editingId && (
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Mégse
                  </Button>
                )}
                <Button type="submit">
                  {editingId ? "Mentés" : "Hozzáadás"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'historical' ? (
              <div className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Historikus árak
              </div>
            ) : (
              <div className="flex items-center">
                <ChartBar className="mr-2 h-5 w-5" />
                Aktuális piaci előrejelzések
              </div>
            )}
          </CardTitle>
          <CardDescription>
            {activeTab === 'historical' 
              ? "Az elmúlt évek termény árak és termésátlagok adatai" 
              : "Aktuális piaci előrejelzések és árfolyam trendek"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Adatok betöltése...</div>
          ) : filteredPrices.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kultúra</TableHead>
                    <TableHead>Év</TableHead>
                    <TableHead>Régió</TableHead>
                    <TableHead>Termésátlag (t/ha)</TableHead>
                    <TableHead>Ár (Ft/t)</TableHead>
                    <TableHead>Utolsó frissítés</TableHead>
                    <TableHead>Műveletek</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrices.map((price) => (
                    <TableRow key={price.id}>
                      <TableCell>{price.culture}</TableCell>
                      <TableCell>{price.year}</TableCell>
                      <TableCell>{price.region}</TableCell>
                      <TableCell>{price.average_yield.toFixed(2)}</TableCell>
                      <TableCell>{price.price.toLocaleString()} Ft</TableCell>
                      <TableCell>{new Date(price.last_updated).toLocaleDateString('hu-HU')}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(price)}>
                            Szerkesztés
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(price.id)}>
                            Törlés
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Nincsenek elérhető árfolyam adatok.
            </div>
          )}
        </CardContent>
        <CardFooter>
          <div className="text-sm text-muted-foreground">
            Összesen {filteredPrices.length} bejegyzés
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminMarketPrices;
