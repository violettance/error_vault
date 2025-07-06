"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useRouter, usePathname } from 'next/navigation';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <h1 className="text-xl font-bold text-white">
          <span className="text-[#8b5cf6]">Error</span>Vault
        </h1>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:gap-3">
          <Button
            className={
              pathname === "/dashboard" ? "bg-[#8b5cf6] text-white hover:bg-[#7c3aed]" : "bg-gray-800 text-white border border-gray-700 hover:bg-gray-700"
            }
            onClick={() => router.push("/dashboard")}
          >
            Yeni Deneme Girişi
          </Button>
          <Button
            className={
              pathname === "/exam-results"
                ? "bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
                : "bg-gray-800 text-white border border-gray-700 hover:bg-gray-700"
            }
            onClick={() => router.push("/exam-results")}
          >
            Deneme Sonuçları
          </Button>
          <Button
            className={
              pathname === "/analiz"
                ? "bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
                : "bg-gray-800 text-white border border-gray-700 hover:bg-gray-700"
            }
            onClick={() => router.push("/analiz")}
          >
            Gelişim Raporu
          </Button>
          <Button
            className={
              pathname === "/ai-deneme-analizi"
                ? "bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
                : "bg-gray-800 text-white border border-gray-700 hover:bg-gray-700"
            }
            onClick={() => router.push("/ai-deneme-analizi")}
          >
            AI Deneme Analizi
          </Button>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menü</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="border-gray-800 bg-gray-900 text-white">
              <SheetHeader>
                <SheetTitle className="text-white">
                  <span className="text-[#8b5cf6]">Error</span>Vault
                </SheetTitle>
                <SheetDescription className="text-gray-400">Deneme sınavı sonuçlarınızı takip edin</SheetDescription>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-4">
                <Button
                  className={
                    pathname === "/dashboard" ? "w-full bg-[#8b5cf6] text-white hover:bg-[#7c3aed]" : "w-full bg-gray-800 text-white border border-gray-700 hover:bg-gray-700"
                  }
                  onClick={() => router.push("/dashboard")}
                >
                  Yeni Deneme Girişi
                </Button>
                <Button
                  className={
                    pathname === "/exam-results"
                      ? "w-full bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
                      : "w-full bg-gray-800 text-white border border-gray-700 hover:bg-gray-700"
                  }
                  onClick={() => router.push("/exam-results")}
                >
                  Deneme Sonuçları
                </Button>
                <Button
                  className={
                    pathname === "/analiz"
                      ? "w-full bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
                      : "w-full bg-gray-800 text-white border border-gray-700 hover:bg-gray-700"
                  }
                  onClick={() => router.push("/analiz")}
                >
                  Gelişim Raporu
                </Button>
                <Button
                  className={
                    pathname === "/ai-deneme-analizi"
                      ? "w-full bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
                      : "w-full bg-gray-800 text-white border border-gray-700 hover:bg-gray-700"
                  }
                  onClick={() => router.push("/ai-deneme-analizi")}
                >
                  AI Deneme Analizi
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
} 