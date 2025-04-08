import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export const AdminMarketPrices = () => {
  const [marketPrices, setMarketPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState<string[]>([]);
  const [cultures, setCultures] = useState<string[]>([]);
  const [newPrice, setNewPrice] = useState({
    culture: "",
    region: "",
    price: 0,
    averageYield: 0,
    year: new Date().getFullYear().toString(),
    is_forecast: true
  });

  useEffect(() => {
    loadMarketPrices();
    loadRegionsAndCultures();
  }, []);

  const loadMarketPrices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('market_prices')
        .select('*')
        .order('culture', { ascending: true });

      if (error) {
        throw error;
      }

      setMarketPrices(data || []);
    } catch (error) {
      console.error("Error loading market prices:", error);
      toast.error("Nem sikerült betölteni a piaci árakat");
    } finally {
      setLoading(false);
    }
  };

  const loadRegionsAndCultures = async () => {
    try {
      const { data: regionData, error: regionError } = await supabase
        .from('market_prices')
        .select('region');

      if (regionError) throw regionError;

      const uniqueRegions = [...new Set(regionData?.map(item => item.region))];
      setRegions(uniqueRegions as string[]);

      const { data: cultureData, error: cultureError } = await supabase
        .from('cultures')
        .select('name');

      if (cultureError) throw cultureError;

      const uniqueCultures = [...new Set(cultureData?.map(item => item.name))];
      setCultures(uniqueCultures as string[]);
    } catch (error) {
      console.error("Error loading regions and cultures:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPrice({ ...newPrice, [name]: value });
  };

  const handleSelectChange = (name: string, value: string | boolean) => {
    const processedValue = typeof value === 'boolean' 
      ? (value ? 'true' : 'false') 
      : value;
    
    setNewPrice({ ...newPrice, [name]: 
      name === 'is_forecast' ? (processedValue === 'true') : processedValue 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('market_prices')
        .insert({
          culture: newPrice.culture,
          region: newPrice.region,
          price: parseFloat(newPrice.price.toString()),
          average_yield: parseFloat(newPrice.averageYield.toString()),
          year: newPrice.year,
          is_forecast: newPrice.is_forecast,
          trend: 0,
          last_updated: new Date().toISOString()
        });

      if (error) throw error;
      
      toast.success("Új piaci ár sikeresen hozzáadva");
      loadMarketPrices();
      
      setNewPrice({
        culture: "",
        region: "",
        price: 0,
        averageYield: 0,
        year: new Date().getFullYear().toString(),
        is_forecast: true
      });
    } catch (error) {
      console.error("Error saving market price:", error);
      toast.error("Nem sikerült menteni a piaci árat");
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Piaci árak kezelése</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Jelenlegi piaci árak</CardTitle>
              <CardDescription>Az összes régióra és növénykultúrára vonatkozó árak</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Betöltés...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Növénykultúra</TableHead>
                      <TableHead>Régió</TableHead>
                      <TableHead>Év</TableHead>
                      <TableHead className="text-right">Ár (Ft/t)</TableHead>
                      <TableHead className="text-right">Átlaghozam (t/ha)</TableHead>
                      <TableHead>Típus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marketPrices.map((price) => (
                      <TableRow key={price.id}>
                        <TableCell>{price.culture}</TableCell>
                        <TableCell>{price.region}</TableCell>
                        <TableCell>{price.year}</TableCell>
                        <TableCell className="text-right">{formatCurrency(price.price)}</TableCell>
                        <TableCell className="text-right">{price.average_yield} t/ha</TableCell>
                        <TableCell>
                          <Badge variant={price.is_forecast ? "outline" : "default"}>
                            {price.is_forecast ? "Előrejelzés" : "Tény"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {marketPrices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          Nincsenek piaci árak az adatbázisban
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Új piaci ár hozzáadása</CardTitle>
              <CardDescription>Adjon meg egy új piaci árat</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="culture">Növénykultúra</Label>
                  <Select 
                    onValueChange={(value) => handleSelectChange("culture", value)} 
                    value={newPrice.culture}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon növénykultúrát" />
                    </SelectTrigger>
                    <SelectContent>
                      {cultures.map((culture) => (
                        <SelectItem key={culture} value={culture}>
                          {culture}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="region">Régió</Label>
                  <Select 
                    onValueChange={(value) => handleSelectChange("region", value)} 
                    value={newPrice.region}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon régiót" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Ár (Ft/tonna)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    value={newPrice.price}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="averageYield">Átlaghozam (tonna/ha)</Label>
                  <Input
                    id="averageYield"
                    name="averageYield"
                    type="number"
                    value={newPrice.averageYield}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="year">Év</Label>
                  <Input
                    id="year"
                    name="year"
                    value={newPrice.year}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Típus</Label>
                  <Select 
                    onValueChange={(value) => handleSelectChange("is_forecast", value)} 
                    value={newPrice.is_forecast ? "true" : "false"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon típust" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Előrejelzés</SelectItem>
                      <SelectItem value="false">Tény adat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </form>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleSubmit}>
                Hozzáadás
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminMarketPrices;
