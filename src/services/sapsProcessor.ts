import { FarmData } from "@/components/LoanApplication";

export const getBlocks = (data: any): string[] => {
  // Extract block IDs from data
  return data.blockIds || [];
};

export interface ParcelData {
  id: string;
  blockId: string;
  area: number;
  location: string;
  cultures: string[];
}

export const parseParcelsFromSapsData = (data: any): ParcelData[] => {
  // Extract parcels from SAPS data or generate sample data
  if (data && data.blockIds && Array.isArray(data.blockIds) && data.blockIds.length > 0) {
    return data.blockIds.map((blockId: string, index: number) => {
      // Choose some cultures for each parcel
      const allCultures = data.cultures || [];
      const parcelCultures = allCultures
        .slice(index % allCultures.length, (index % allCultures.length) + 2)
        .map((c: any) => c.name);
      
      return {
        id: `parcel-${index + 1}`,
        blockId,
        area: data.hectares / data.blockIds.length,
        location: `${data.region || 'Ismeretlen'} külterület`,
        cultures: parcelCultures.length > 0 ? parcelCultures : ['Ismeretlen növénykultúra']
      };
    });
  }
  
  return [];
};
