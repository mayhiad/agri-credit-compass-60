
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import AdminCustomerList from "./AdminCustomerList";
import AdminLoanList from "./AdminLoanList";
import AdminMarketPrices from "./AdminMarketPrices";
import { Database, Users, CreditCard, BarChart } from "lucide-react";

interface AdminDashboardProps {
  isAdmin: boolean;
  isFinanceOfficer: boolean;
}

const AdminDashboard = ({ isAdmin, isFinanceOfficer }: AdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState("customers");

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Card className="mb-4">
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-2">Admin Irányítópult</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Adminisztrátori" : "Pénzügyi ügyintézői"} jogosultsággal rendelkezik
          </p>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <TabsTrigger value="customers" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Ügyfelek</span>
            <span className="md:hidden">Ügyfelek</span>
          </TabsTrigger>
          <TabsTrigger value="loans" className="flex items-center">
            <CreditCard className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Hitelek</span>
            <span className="md:hidden">Hitelek</span>
          </TabsTrigger>
          <TabsTrigger value="market-prices" className="flex items-center">
            <BarChart className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Piaci árak</span>
            <span className="md:hidden">Árak</span>
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center">
            <Database className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Adatbázis</span>
            <span className="md:hidden">Adatok</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          <AdminCustomerList isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          <AdminLoanList isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="market-prices" className="space-y-4">
          <AdminMarketPrices />
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">Adatbázis műveletek</h2>
              <p>
                Ezen a felületen különböző adatbázis műveleteket végezhet majd, amint implementálva lesznek.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
