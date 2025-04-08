
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add the formatNumber utility function
export function formatNumber(value: number | undefined | null, fractionDigits: number = 2): string {
  if (value === undefined || value === null) {
    return "-";
  }
  
  return new Intl.NumberFormat('hu-HU', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
