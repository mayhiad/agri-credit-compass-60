
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUp, ArrowDown, Save, Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { MarketPrice } from "@/types/farm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CURRENT_YEAR = new Date().getFullYear().toString();
const PREVIOUS_YEARS = Array.from({ length: 5 }, (_, i) => (Number(CURRENT_YEAR) - (i + 1)).toString());
const ALL_YEARS = [CURRENT_YEAR, ...PREVIOUS_YEARS];

const AdminMarketPrices = () => {
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<MarketPrice[]>([]);
  const [editingPrice, setEditingPrice] = useState<MarketPrice | null>(null);
  const [newCropName, setNewCropName] = useState("");
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchMarketPrices();
  }, []);
  
  useEffect(() => {
    if (marketPrices.length > 0) {
      filterPricesByYear(selectedYear);
    }
  }, [marketPrices, selectedYear]);
  
  const fetchMarketPrices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('market_prices')
        .select('*')
        .order('culture', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      setMarketPrices(data || []);
      filterPricesByYear(selectedYear);
    } catch (error) {
      console.error("Hiba a piaci árak lekérése során:", error);
      toast.error("Nem sikerült lekérni a piaci árakat");
    } finally {
      setLoading(false);
    }
  };
  
  const filterPricesByYear = (year: string) => {
    const filtered = marketPrices.filter(price => price.year === year);
    setFilteredPrices(filtered);
  };
  
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
  };
  
  const startEditing = (price: MarketPrice) => {
    setEditingPrice({...price});
  };
  
  const cancelEditing = () => {
    setEditingPrice(null);
  };
  
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingPrice) return;
    
    setEditingPrice({
      ...editingPrice,
      price: Number(e.target.value)
    });
  };
  
  const handleYieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingPrice) return;
    
    setEditingPrice({
      ...editingPrice,
      averageYield: Number(e.target.value)
    });
  };
  
  const handleTrendChange = (trend: number) => {
    if (!editingPrice) return;
    
    setEditingPrice({
      ...editingPrice,
      trend
    });
  };
  
  const savePrice = async () => {
    if (!editingPrice) return;
    
    try {
      const { error } = await supabase
        .from('market_prices')
        .update({
          price: editingPrice.price,
          averageYield: editingPrice.averageYield,
          trend: editingPrice.trend,
          last_updated: new Date().toISOString()
        })
        .eq('id', editingPrice.id);
      
      if (error) {
        throw error;
      }
      
      // Update the local state
      setMarketPrices(marketPrices.map(p => 
        p.id === editingPrice.id ? editingPrice : p
      ));
      
      toast.success(`${editingPrice.culture} árak sikeresen frissítve`);
      setEditingPrice(null);
    } catch (error) {
      console.error("Hiba a piaci ár mentése során:", error);
      toast.error("Nem sikerült menteni a piaci árakat");
    }
  };
  
  const addNewCrop = async () => {
    if (!newCropName.trim()) {
      toast.error("Adjon meg egy terménynevet");
      return;
    }
    
    try {
      // Check if the crop already exists for this year
      const existingCrop = marketPrices.find(p => 
        p.culture.toLowerCase() === newCropName.toLowerCase() && p.year === selectedYear
      );
      
      if (existingCrop) {
        toast.error(`${newCropName} már létezik ebben az évben`);
        return;
      }
      
      const newCrop: Partial<MarketPrice> = {
        culture: newCropName.trim(),
        price: 75000, // Default price
        averageYield: 5.0, // Default yield
        trend: 0,
        region: 'Magyarország',
        year: selectedYear,
        is_forecast: selectedYear === CURRENT_YEAR
      };
      
      const { data, error } = await supabase
        .from('market_prices')
        .insert(newCrop)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      setMarketPrices([...marketPrices, data]);
      toast.success(`${newCropName} sikeresen hozzáadva`);
      setNewCropName("");
    } catch (error) {
      console.error("Hiba az új termény hozzáadása során:", error);
      toast.error("Nem sikerült hozzáadni az új terményt");
    }
  };
  
  const deleteCrop = async (id: string) => {
    try {
      const { error } = await supabase
        .from('market_prices')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      setMarketPrices(marketPrices.filter(p => p.id !== id));
      toast.success("Termény sikeresen törölve");
    } catch (error) {
      console.error("Hiba a termény törlése során:", error);
      toast.error("Nem sikerült törölni a terményt");
    }
  };
  
  const copyFromPreviousYear = async () => {
    const previousYear = (Number(selectedYear) - 1).toString();
    
    try {
      // Get prices from previous year
      const { data: previousYearPrices, error: fetchError } = await supabase
        .from('market_prices')
        .select('*')
        .eq('year', previousYear);
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (!previousYearPrices || previousYearPrices.length === 0) {
        toast.error(`Nincs adat a(z) ${previousYear}. évből`);
        return;
      }
      
      // Prepare new records for current year
      const newRecords = previousYearPrices.map(price => ({
        culture: price.culture,
        price: Math.round(price.price * 1.05), // 5% increase as default
        averageYield: price.averageYield,
        trend: 0,
        region: price.region,
        year: selectedYear,
        is_forecast: true
      }));
      
      // Insert the new records
      const { error: insertError } = await supabase
        .from('market_prices')
        .insert(newRecords);
      
      if (insertError) {
        throw insertError;
      }
      
      toast.success(`Árak sikeresen átmásolva a(z) ${previousYear}. évből`);
      fetchMarketPrices();
    } catch (error) {
      console.error("Hiba az árak másolása során:", error);
      toast.error("Nem sikerült másolni az árakat az előző évből");
    }
  };
  
  return (
    <div className="container mx-auto py-10 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Piaci árak kezelése</CardTitle>
          <CardDescription>
            Itt állíthatja be a különböző terményekhez tartozó piaci árakat és termésátlagokat, amelyeket a rendszer a hitelkalkulációhoz használ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="year-select">Év kiválasztása</Label>
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Válasszon évet" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_YEARS.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              {filteredPrices.length === 0 && selectedYear !== CURRENT_YEAR && (
                <Button className="mt-8" onClick={copyFromPreviousYear}>
                  Másolás előző évből
                </Button>
              )}
            </div>
          </div>
          
          <div className="mb-6 flex gap-4">
            <div className="flex-1">
              <Label htmlFor="new-crop">Új termény hozzáadása</Label>
              <div className="flex gap-2 mt-2">
                <Input 
                  id="new-crop" 
                  value={newCropName} 
                  onChange={e => setNewCropName(e.target.value)} 
                  placeholder="Termény neve" 
                />
                <Button onClick={addNewCrop}>
                  <Plus className="h-4 w-4 mr-2" />
                  Hozzáadás
                </Button>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <p>Adatok betöltése...</p>
            </div>
          ) : filteredPrices.length === 0 ? (
            <div className="text-center py-8 bg-muted/20 rounded-md">
              <p className="text-muted-foreground">Nincs megadva piaci adat erre az évre.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Termény</TableHead>
                    <TableHead className="text-right">Átlag terméshozam (t/ha)</TableHead>
                    <TableHead className="text-right">Egységár (Ft/t)</TableHead>
                    <TableHead className="text-right">Trend</TableHead>
                    <TableHead className="text-right">Utolsó frissítés</TableHead>
                    <TableHead className="text-right">Műveletek</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrices.map(price => (
                    <TableRow key={price.id}>
                      <TableCell className="font-medium">{price.culture}</TableCell>
                      
                      <TableCell className="text-right">
                        {editingPrice?.id === price.id ? (
                          <Input 
                            type="number" 
                            value={editingPrice.averageYield} 
                            onChange={handleYieldChange}
                            className="w-24 text-right ml-auto"
                            step="0.1"
                            min="0"
                          />
                        ) : (
                          formatNumber(price.averageYield)
                        )}
                      </TableCell>
                      
                      <TableCell className="text-right">
                        {editingPrice?.id === price.id ? (
                          <Input 
                            type="number" 
                            value={editingPrice.price} 
                            onChange={handlePriceChange}
                            className="w-28 text-right ml-auto"
                            step="1000"
                            min="0"
                          />
                        ) : (
                          formatCurrency(price.price)
                        )}
                      </TableCell>
                      
                      <TableCell className="text-right">
                        {editingPrice?.id === price.id ? (
                          <div className="flex gap-1 justify-end">
                            <Button 
                              variant={editingPrice.trend === -1 ? "default" : "outline"} 
                              size="icon" 
                              onClick={() => handleTrendChange(-1)}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant={editingPrice.trend === 0 ? "default" : "outline"} 
                              size="icon" 
                              onClick={() => handleTrendChange(0)}
                            >
                              −
                            </Button>
                            <Button 
                              variant={editingPrice.trend === 1 ? "default" : "outline"} 
                              size="icon" 
                              onClick={() => handleTrendChange(1)}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            {price.trend === -1 && <ArrowDown className="h-4 w-4 text-red-500" />}
                            {price.trend === 0 && <span>−</span>}
                            {price.trend === 1 && <ArrowUp className="h-4 w-4 text-green-500" />}
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell className="text-right">
                        {new Date(price.last_updated).toLocaleDateString('hu-HU')}
                      </TableCell>
                      
                      <TableCell className="text-right">
                        {editingPrice?.id === price.id ? (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" onClick={savePrice} variant="default">
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" onClick={cancelEditing} variant="outline">
                              Mégse
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" onClick={() => startEditing(price)} variant="outline">
                              Szerkesztés
                            </Button>
                            <Button size="sm" onClick={() => deleteCrop(price.id)} variant="destructive">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMarketPrices;
