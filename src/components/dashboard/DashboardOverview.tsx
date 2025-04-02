
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { FarmData } from "@/components/LoanApplication";
import { useNavigate } from "react-router-dom";

interface DashboardOverviewProps {
  farmData: FarmData;
}

const DashboardOverview = ({ farmData }: DashboardOverviewProps) => {
  const navigate = useNavigate();
  
  const handleStartLoanApplication = () => {
    // Store farmData in localStorage to access it in the LoanApplication component
    localStorage.setItem('farmData', JSON.stringify(farmData));
    
    // Navigate to the homepage with a query parameter to indicate we should skip to loan terms
    navigate("/?step=loan-terms");
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Gazdaságom adatai</CardTitle>
          <CardDescription>
            SAPS dokumentum alapján
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Dokumentum azonosító</TableCell>
                <TableCell>{farmData.documentId}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Régió</TableCell>
                <TableCell>{farmData.region}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Gazdálkodó</TableCell>
                <TableCell>{farmData.applicantName}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Összes terület</TableCell>
                <TableCell>{farmData.hectares} ha</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Éves árbevétel</TableCell>
                <TableCell>{formatCurrency(farmData.totalRevenue)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Hitelkeret információ</CardTitle>
          <CardDescription>
            A SAPS adatok alapján kalkulált hitelkeret
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="font-semibold text-lg mb-1">Elérhető hitelkeret:</div>
            <div className="text-3xl font-bold text-green-700 mb-2">
              {formatCurrency(Math.round(farmData.totalRevenue * 0.4))}
            </div>
            <div className="text-sm text-green-600">
              A szerződéskötéstől számított 48 órán belül folyósítunk.
            </div>
          </div>
          
          <div className="mt-4">
            <Button className="w-full" onClick={handleStartLoanApplication}>
              Hiteligénylés indítása
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;
