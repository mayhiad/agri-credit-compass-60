
import React from "react";
import FarmLocation from "@/components/FarmLocation";

const DashboardMap = () => {
  // This is just a placeholder handler since we're only displaying the map
  // in the dashboard context, not using it for navigation
  const handleComplete = () => {
    console.log("Map view complete");
  };
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Földterületek térképe</h2>
      <p className="text-muted-foreground mb-4">
        Az alábbi térkép mutatja a gazdaságához tartozó földterületeket
      </p>
      
      <FarmLocation onComplete={handleComplete} />
    </div>
  );
};

export default DashboardMap;
