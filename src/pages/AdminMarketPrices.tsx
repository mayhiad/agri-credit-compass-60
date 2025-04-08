import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketPrice } from "@/types/farm";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Minus, Trash, PlusCircle, Save } from "lucide-react";

const AdminMarketPrices = () => {
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState("Magyarország");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [regions, setRegions] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [cultures, setCultures] = useState<string[]>([]);
  const [editingPrice, setEditingPrice] = useState<Partial<MarketPrice> | null>(null);

  useEffect(() => {
    const fetchUniqueValues = async () => {
      try {
        // Cultures without using distinct
        const { data: culturesData, error: culturesError } = await supabase
          .from('market_prices')
          .select('culture');
        
        if (culturesError) {
          console.error("Error fetching cultures:", culturesError);
          return;
        }
        
        // Extract unique culture values manually
        const uniqueCultures = Array.from(
          new Set(culturesData.map(item => item.culture as string))
        ).filter(Boolean);
        
        setCultures(uniqueCultures);
        
        // Regions without using distinct
        const { data: regionsData, error: regionsError } = await supabase
          .from('market_prices')
          .select('region');
        
        if (regionsError) {
          console.error("Error fetching regions:", regionsError);
          return;
        }
        
        // Extract unique region values manually
        const uniqueRegions = Array.from(
          new Set(regionsData.map(item => item.region as string))
        ).filter(Boolean);
        
        setRegions(uniqueRegions);
      } catch (error) {
        console.error("Error fetching unique values:", error);
      }
    };
    
    fetchUniqueValues();
  }, [supabase]);

  useEffect(() => {
    fetchMarketPrices();
  }, [selectedRegion, selectedYear]);

  const fetchMarketPrices = async () => {
    setLoading(true);
    try {
      // Fetch years if not already loaded
      if (years.length === 0) {
        const { data: yearsData } = await supabase
          .from('market_prices')
          .select('year')
          .distinct();
        
        if (yearsData) {
          const uniqueYears = [...new Set(yearsData.map(item => item.year))];
          setYears(uniqueYears);
          
          // If current year isn't in the list, add it
          const currentYear = new Date().getFullYear().toString();
          if (!uniqueYears.includes(currentYear)) {
            setYears(prev => [...prev, currentYear]);
          }
        }
      }

      // Then fetch prices for the selected region and year
      const { data: pricesData, error } = await supabase
        .from('market_prices')
        .select('*')
        .eq('region', selectedRegion)
        .eq('year', selectedYear);
      
      if (error) throw error;
      
      if (pricesData) {
        // Map database fields to our MarketPrice interface
        const transformedPrices = pricesData.map(price => ({
          id: price.id,
          culture: price.culture,
          averageYield: price.average_yield,
          price: price.price,
          trend: price.trend,
          last_updated: price.last_updated,
          region: price.region,
          year: price.year,
          is_forecast: price.is_forecast
        }));
        
        setMarketPrices(transformedPrices);
      }
    } catch (error) {
      console.error("Error fetching market prices:", error);
      toast.error("Hiba történt az árak betöltése során");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (price: MarketPrice) => {
    setEditingPrice(price);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('market_prices')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setMarketPrices(prices => prices.filter(price => price.id !== id));
      toast.success("Ár sikeresen törölve");
    } catch (error) {
      console.error("Error deleting price:", error);
      toast.error("Hiba történt az ár törlése során");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPrice) return;
    
    try {
      // Map our interface back to database field names
      const { error } = await supabase
        .from('market_prices')
        .upsert({
          id: editingPrice.id,
          culture: editingPrice.culture,
          average_yield: editingPrice.averageYield,
          price: editingPrice.price,
          trend: editingPrice.trend || 0,
          region: editingPrice.region || selectedRegion,
          year: editingPrice.year || selectedYear,
          is_forecast: editingPrice.is_forecast || false,
          last_updated: new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Update local state
      fetchMarketPrices();
      setEditingPrice(null);
      toast.success("Ár sikeresen mentve");
    } catch (error) {
      console.error("Error saving price:", error);
      toast.error("Hiba történt az ár mentése során");
    }
  };

  const handleCreateBulk = async () => {
    try {
      // Example default values
      const defaultCrops = [
        { culture: "Búza", price: 85000, averageYield: 5.5, trend: 0 },
        { culture: "Kukorica", price: 75000, averageYield: 8.2, trend: 0 },
        { culture: "Napraforgó", price: 160000, averageYield: 3.2, trend: 0 },
        { culture: "Árpa", price: 78000, averageYield: 5.0, trend: 0 },
        { culture: "Repce", price: 170000, averageYield: 3.2, trend: 0 },
        { culture: "Szója", price: 150000, averageYield: 2.8, trend: 0 }
      ];
      
      // Convert to database field names
      const bulkData = defaultCrops.map(crop => ({
        culture: crop.culture,
        average_yield: crop.averageYield,
        price: crop.price,
        trend: crop.trend,
        region: selectedRegion,
        year: selectedYear,
        is_forecast: false,
        last_updated: new Date().toISOString()
      }));
      
      const { error } = await supabase
        .from('market_prices')
        .insert(bulkData);
      
      if (error) throw error;
      
      fetchMarketPrices();
      toast.success("Alapértelmezett árak sikeresen hozzáadva");
    } catch (error) {
      console.error("Error creating bulk prices:", error);
      toast.error("Hiba történt az árak létrehozása során");
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Piaci árak kezelése</CardTitle>
          <CardDescription>
            Itt kezelheti a különböző régió és év szerinti piaci árakat, amelyek alapján a rendszer kiszámítja a hitelkereteket.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="w-1/2">
              <Select
                value={selectedRegion}
                onValueChange={setSelectedRegion}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válassz régiót" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map(region => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-1/2">
              <Select
                value={selectedYear}
                onValueChange={setSelectedYear}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válassz évet" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-12">Adatok betöltése...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Növény</TableHead>
                    <TableHead className="text-right">Átlaghozam (t/ha)</TableHead>
                    <TableHead className="text-right">Ár (Ft/t)</TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                    <TableHead className="text-right">Utolsó frissítés</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketPrices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        Nincs adat a kiválasztott régióra és évre
                      </TableCell>
                    </TableRow>
                  ) : (
                    marketPrices.map(price => (
                      <TableRow key={price.id}>
                        <TableCell>{price.culture}</TableCell>
                        <TableCell className="text-right">{formatNumber(price.averageYield, 1)}</TableCell>
                        <TableCell className="text-right">{formatNumber(price.price, 0)}</TableCell>
                        <TableCell className="text-center">
                          {price.trend > 0 ? (
                            <ArrowUp className="inline text-green-600" />
                          ) : price.trend < 0 ? (
                            <ArrowDown className="inline text-red-600" />
                          ) : (
                            <Minus className="inline text-gray-600" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Date(price.last_updated).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(price)}
                            >
                              Szerkesztés
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(price.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              <div className="mt-6 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setEditingPrice({})}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Új ár hozzáadása
                </Button>
                {marketPrices.length === 0 && (
                  <Button
                    variant="default"
                    onClick={handleCreateBulk}
                  >
                    Alapértelmezett árak létrehozása
                  </Button>
                )}
              </div>
            </>
          )}
          
          {editingPrice && (
            <Card className="mt-6 border-2 border-primary/10">
              <CardHeader>
                <CardTitle>
                  {editingPrice.id ? 'Ár szerkesztése' : 'Új ár hozzáadása'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Növény</label>
                    <Input
                      value={editingPrice.culture || ''}
                      onChange={e => setEditingPrice({...editingPrice, culture: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Átlaghozam (t/ha)</label>
                    <Input
                      type="number"
                      value={editingPrice.averageYield || ''}
                      onChange={e => setEditingPrice({...editingPrice, averageYield: parseFloat(e.target.value)})}
                      className="mt-1"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Ár (Ft/t)</label>
                    <Input
                      type="number"
                      value={editingPrice.price || ''}
                      onChange={e => setEditingPrice({...editingPrice, price: parseFloat(e.target.value)})}
                      className="mt-1"
                      step="1000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Trend</label>
                    <Select
                      value={(editingPrice.trend || 0).toString()}
                      onValueChange={value => setEditingPrice({...editingPrice, trend: parseInt(value)})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Növekvő ár</SelectItem>
                        <SelectItem value="0">Stagnáló ár</SelectItem>
                        <SelectItem value="-1">Csökkenő ár</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditingPrice(null)}
                  >
                    Mégsem
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Mentés
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMarketPrices;
