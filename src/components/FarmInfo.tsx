
// This file re-exports the refactored components to maintain backward compatibility
import { FarmData } from "@/types/farm";
import FarmSummary from "./farm/FarmSummary";
import FarmInfoDisplay from "./farm/FarmInfoDisplay";

interface FarmInfoProps {
  farmData: FarmData;
  onComplete: () => void;
}

// Re-export the components with the original names to maintain compatibility
export const FarmInfo = FarmSummary;
export { FarmInfoDisplay };

export default FarmInfoDisplay;
