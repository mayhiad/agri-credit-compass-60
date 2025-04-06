
import React from "react";

const EmptyHistoricalState = () => {
  return (
    <div className="py-8 text-center text-muted-foreground">
      <p>Nincs megjeleníthető történeti adat.</p>
      <p className="text-sm mt-2">Töltsön fel SAPS dokumentumokat a korábbi évekből a történeti adatok megjelenítéséhez.</p>
    </div>
  );
};

export default EmptyHistoricalState;
