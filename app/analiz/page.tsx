import { Suspense } from "react";
import AnalysisClient from "@/components/AnalysisClient";

export default function DetayliAnalizPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <AnalysisClient />
    </Suspense>
  );
} 