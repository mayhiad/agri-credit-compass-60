
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow flex items-center">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center py-16">
            <div>
              <h1 className="text-5xl font-bold tracking-tight mb-6">
                A modern megoldás a mezőgazdasági finanszírozásra
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Egyszerűsítse a gazdálkodását és finanszírozási igényeit az <span className="font-medium">agri<span className="text-blue-600">FI</span><span className="text-black">x</span></span> platformunkkal. Növelje a hatékonyságot és csökkentse a dokumentációs terheket.
              </p>
              <div className="flex gap-4">
                <Button asChild size="lg">
                  <Link to="/dashboard">Irányítópult</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/auth">Bejelentkezés</Link>
                </Button>
              </div>
            </div>
            
            <div className="flex justify-center">
              <img 
                src="/placeholder.svg" 
                alt="Agricultural finance illustration" 
                className="max-w-md w-full rounded-lg shadow-lg" 
              />
            </div>
          </div>
        </div>
      </main>
      
      <footer className="py-6 bg-slate-50">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} agri<span className="text-blue-600">FI</span><span className="text-black">x</span> - Minden jog fenntartva.
        </div>
      </footer>
    </div>
  );
}
