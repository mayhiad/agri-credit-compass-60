
import { FarmData } from "@/components/LoanApplication";
import { supabase } from "@/integrations/supabase/client";

// A feldolgozás során nyert részletes adatokhoz típus definíciók
export interface ParcelData {
  blockId: string;          // Blokkidentifikáció
  parcelId: string;         // Parcella azonosító
  culture: string;          // Termesztett kultúra
  hectares: number;         // Terület nagysága (ha)
  location: {               // Földrajzi elhelyezkedés
    county: string;         // Megye
    settlement: string;     // Település
    topographicNumber: string; // Helyrajzi szám
  };
  cultivationMethod?: string; // Művelési mód (ha rendelkezésre áll)
  ecologicalArea?: boolean;   // Ökológiai jelentőségű terület-e
  protected?: boolean;        // Védett terület-e
}

interface MarketPrice {
  culture: string;         // Kultúra neve
  averageYield: number;    // Átlagos termésátlag (t/ha)
  price: number;           // Jelenlegi piaci ár (Ft/t)
  trend: number;           // Ártrend (-1: csökkenő, 0: stabil, 1: növekvő)
  lastUpdated: Date;       // Utolsó frissítés dátuma
}

// Az aktuális világpiaci árak lekérdezése
async function fetchMarketPrices(cultures: string[]): Promise<MarketPrice[]> {
  try {
    // Valós implementációban itt API hívás történne a világpiaci árak lekérésére
    // Most egy mock adatot adunk vissza
    
    // Az aktuális termésátlagok és árak (példa adatok)
    const marketPrices: MarketPrice[] = [
      {
        culture: "Búza",
        averageYield: 5.2, // t/ha
        price: 85000, // Ft/t
        trend: 0,
        lastUpdated: new Date()
      },
      {
        culture: "Kukorica",
        averageYield: 7.8, // t/ha
        price: 72000, // Ft/t
        trend: 1,
        lastUpdated: new Date()
      },
      {
        culture: "Napraforgó",
        averageYield: 2.9, // t/ha
        price: 170000, // Ft/t
        trend: 0,
        lastUpdated: new Date()
      },
      {
        culture: "Repce",
        averageYield: 3.1, // t/ha
        price: 190000, // Ft/t
        trend: 1, 
        lastUpdated: new Date()
      },
      {
        culture: "Árpa",
        averageYield: 4.8, // t/ha
        price: 70000, // Ft/t
        trend: -1,
        lastUpdated: new Date()
      }
    ];
    
    // Csak a megadott kultúrákhoz tartozó adatokat adjuk vissza
    return marketPrices.filter(price => cultures.includes(price.culture));
  } catch (error) {
    console.error("Hiba a piaci árak lekérdezése során:", error);
    throw new Error("Nem sikerült lekérdezni az aktuális piaci árakat");
  }
}

// SAPS dokumentumból kinyert adatok tárolása az adatbázisban
async function storeParcelsData(documentId: string, farmId: string, parcels: ParcelData[]) {
  try {
    // Valós implementáció: az adatok tárolása Supabase-ben
    // Ezt később, az adatbázis struktúra kialakítása után fogjuk implementálni
    console.log("Tároljuk a parcellákat az adatbázisban:", parcels);
  } catch (error) {
    console.error("Hiba a parcellák mentése során:", error);
    // Nem dobjuk tovább a hibát, mert nem kritikus a folyamat szempontjából
  }
}

// PDF és Excel feldolgozás
export async function processSapsDocument(file: File): Promise<FarmData> {
  return new Promise((resolve, reject) => {
    try {
      // Valódi implementációban itt történne a PDF/Excel fájl tényleges feldolgozása
      // különböző könyvtárak segítségével (pl. pdf.js, xlsx.js)
      
      // Szimulált feldolgozási idő
      setTimeout(() => {
        // Példa részletes parcella információkra, amit a dokumentumból nyernénk ki
        const parcels: ParcelData[] = [
          {
            blockId: "KDPJ-34",
            parcelId: "P2023-4501",
            culture: "Búza",
            hectares: 120.25,
            location: {
              county: "Hajdú-Bihar",
              settlement: "Debrecen",
              topographicNumber: "0123/45"
            },
            cultivationMethod: "Hagyományos",
            ecologicalArea: false,
            protected: false
          },
          {
            blockId: "KDPJ-34",
            parcelId: "P2023-4502",
            culture: "Búza",
            hectares: 80.50,
            location: {
              county: "Hajdú-Bihar",
              settlement: "Debrecen",
              topographicNumber: "0123/46"
            },
            cultivationMethod: "Hagyományos",
            ecologicalArea: false,
            protected: false
          },
          {
            blockId: "LHNM-78",
            parcelId: "P2023-4503",
            culture: "Kukorica",
            hectares: 150.75,
            location: {
              county: "Hajdú-Bihar",
              settlement: "Hajdúszoboszló",
              topographicNumber: "0456/12"
            },
            cultivationMethod: "Precíziós",
            ecologicalArea: false,
            protected: false
          },
          {
            blockId: "PTVS-92",
            parcelId: "P2023-4504",
            culture: "Napraforgó",
            hectares: 100.30,
            location: {
              county: "Hajdú-Bihar",
              settlement: "Balmazújváros",
              topographicNumber: "0789/34"
            },
            cultivationMethod: "Hagyományos",
            ecologicalArea: true,
            protected: false
          }
        ];

        // Dokumentumból kinyert általános információk
        const documentId = "SAPS-2023-568742";
        const applicantName = "Kovács János";
        const region = "Dél-Alföld";
        
        // Parcellák összegzése kultúránként
        const cultureGroups: Record<string, {hectares: number, parcels: ParcelData[]}> = {};
        
        parcels.forEach(parcel => {
          if (!cultureGroups[parcel.culture]) {
            cultureGroups[parcel.culture] = { hectares: 0, parcels: [] };
          }
          cultureGroups[parcel.culture].hectares += parcel.hectares;
          cultureGroups[parcel.culture].parcels.push(parcel);
        });
        
        // Összes terület kiszámítása
        const totalHectares = parcels.reduce((sum, parcel) => sum + parcel.hectares, 0);
        
        // Kultúrák listájának előkészítése a piaci árak lekéréséhez
        const cultureNames = Object.keys(cultureGroups);
        
        // Piaci árak lekérése
        fetchMarketPrices(cultureNames).then(marketPrices => {
          // Becsült bevétel kiszámítása kultúránként
          const cultures = cultureNames.map(name => {
            const group = cultureGroups[name];
            const price = marketPrices.find(p => p.culture === name);
            
            // Becsült bevétel: terület * átlagos termésátlag * ár
            const estimatedRevenue = price 
              ? group.hectares * price.averageYield * price.price 
              : group.hectares * 500000; // Alapértelmezett becslés, ha nincs piaci ár
            
            return {
              name,
              hectares: group.hectares,
              estimatedRevenue,
              blockIds: [...new Set(group.parcels.map(p => p.blockId))], // Unikális blokkazonosítók listája
              parcels: group.parcels // Az összes parcella részletes adatai
            };
          });
          
          // Teljes becsült bevétel
          const totalRevenue = cultures.reduce((sum, culture) => sum + culture.estimatedRevenue, 0);
          
          // FarmData objektum létrehozása
          const farmData: FarmData = {
            hectares: totalHectares,
            cultures: cultures.map(({ name, hectares, estimatedRevenue }) => ({
              name,
              hectares,
              estimatedRevenue
            })),
            totalRevenue,
            region,
            documentId,
            applicantName,
            blockIds: [...new Set(parcels.map(p => p.blockId))], // Összes egyedi blokkazonosító
            parcels: parcels, // Az összes részletes parcella adat
            marketPrices: marketPrices // Aktuális piaci árak
          };
          
          resolve(farmData);
        }).catch(error => {
          reject(new Error(`Nem sikerült a piaci árakat feldolgozni: ${error.message}`));
        });
      }, 1500);
    } catch (error) {
      reject(new Error(`Feldolgozási hiba: ${error instanceof Error ? error.message : "Ismeretlen hiba"}`));
    }
  });
}
