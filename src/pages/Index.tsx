
import { Button } from "@/components/ui/button";
import { NavBar } from "@/components/NavBar";
import { Link } from "react-router-dom";
import NewApiDemo from "@/components/NewApiDemo";

export default function Index() {
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="flex-1 container max-w-6xl mx-auto p-4 md:p-8">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-5xl font-bold">Agrár Hitelező</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Agrárvállalkozások számára nyújtunk egyszerű és gyors hiteleket, AI-alapú területalapú támogatás dokumentum feldolgozással.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button asChild size="lg">
                <Link to="/auth">Bejelentkezés</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/dashboard">Irányítópult</Link>
              </Button>
            </div>
          </div>
          
          <div className="pt-8">
            <h2 className="text-2xl font-bold text-center mb-6">Új API Demó</h2>
            <NewApiDemo />
          </div>
        </div>
      </main>
      <footer className="border-t py-6 md:py-8">
        <div className="container max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Agrár Hitelező. Minden jog fenntartva.
        </div>
      </footer>
    </div>
  );
}
