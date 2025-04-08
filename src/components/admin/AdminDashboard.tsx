
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdminLoanList from "./AdminLoanList";
import AdminCustomerList from "./AdminCustomerList";
import AdminMarketPrices from "./AdminMarketPrices";
import DeleteUser from "./DeleteUser";
import AdminClaudeResponses from "./AdminClaudeResponses";

interface AdminDashboardProps {
  isAdmin: boolean;
  isFinanceOfficer: boolean;
}

const AdminDashboard = ({ isAdmin, isFinanceOfficer }: AdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState<string>("customers");

  return (
    <div className="container max-w-7xl mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">Admin vezérlőpult</CardTitle>
          <CardDescription>
            Ügyfelek és hitelkérelmek kezelése
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs 
        defaultValue={activeTab} 
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-5 max-w-3xl">
          <TabsTrigger value="customers">Ügyfelek</TabsTrigger>
          <TabsTrigger value="loans">Hitelkérelmek</TabsTrigger>
          <TabsTrigger value="market">Piaci árak</TabsTrigger>
          <TabsTrigger value="claude">Claude válaszok</TabsTrigger>
          {isAdmin && <TabsTrigger value="tools">Admin eszközök</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="customers">
          <AdminCustomerList isAdmin={isAdmin} isFinanceOfficer={isFinanceOfficer} />
        </TabsContent>
        
        <TabsContent value="loans">
          <AdminLoanList isAdmin={isAdmin} isFinanceOfficer={isFinanceOfficer} />
        </TabsContent>
        
        <TabsContent value="market">
          <AdminMarketPrices isAdmin={isAdmin} isFinanceOfficer={isFinanceOfficer} />
        </TabsContent>
        
        <TabsContent value="claude">
          <AdminClaudeResponses isAdmin={isAdmin} isFinanceOfficer={isFinanceOfficer} />
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="tools">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DeleteUser />
              {/* More admin tools can be added here */}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
