import { Suspense } from "react";
import AnalysisClient from "@/components/AnalysisClient";
import Header from "@/components/ui/header";

export default function GelisimRaporuPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Gelişim Raporu</h1>
        <Suspense fallback={<div className="text-center">Yükleniyor...</div>}>
          <AnalysisClient />
        </Suspense>
      </div>
    </div>
  );
} 