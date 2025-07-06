"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, User, Target, ArrowRight, CheckCircle, Sparkles } from "lucide-react";

export default function LandingClient() {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/save-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save email');
      }

      setEmailSubmitted(true);
      setEmail("");
    } catch (error) {
      console.error('Email submission error:', error);
      alert('Email kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleErrorVaultAccess = () => {
    if (!userId.trim()) {
      alert("Lütfen User ID'nizi girin");
      return;
    }
    
    // Only allow access if user_id is exactly "demo_user"
    if (userId.trim() !== "demo_user") {
      alert("Geçersiz User ID. Lütfen doğru User ID'nizi girin.");
      return;
    }
    
    router.push(`/dashboard?user_id=${userId}`);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-bold text-white">Rota</span>
          </div>
          <Badge variant="secondary" className="bg-purple-600/20 text-purple-200 border-purple-500/30">
            Beta
          </Badge>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <Sparkles className="w-8 h-8 text-purple-400 mr-3" />
            <span className="text-purple-300 font-medium">AI Destekli Sınav Hazırlık Platformu</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-8 leading-tight">
            Sınav Başarını
            <span className="text-purple-400">
              {" "}Maksimize Et
            </span>
          </h1>
          
                    <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Sınırsız soru çözme ve AI destekli gelişim takibi ile 
            sınava çalışma deneyimini yeniden tanımlayan platform.
          </p>
          
          {/* Email Collection - Direkt Hero Altında */}
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              
            </h2>
            
            {!emailSubmitted ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-4 w-6 h-6 text-purple-400" />
                  <Input
                    type="email"
                    placeholder="Email adresinizi girin"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-14 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 text-lg focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white text-lg font-semibold shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading ? "Kaydediliyor..." : "Erken Erişim İçin Kayıt Ol"}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </form>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Teşekkürler!</h3>
                <p className="text-slate-300">
                  Email adresiniz kaydedildi. Erken erişim başladığında size haber vereceğiz.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Platform Özellikleri */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Rota ile Sınava Çalışma Deneyimi
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-xl font-semibold text-white mb-4">🎯 Sınırsız Soru Çözme</h3>
              <p className="text-slate-300">
                Binlerce soru arasından seviyene uygun olanları çöz. AI sürekli senin için yeni sorular önerir.
              </p>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-xl font-semibold text-white mb-4">🤖 AI Gelişim Takibi</h3>
              <p className="text-slate-300">
                Her çözümün analiz edilir. Hangi konularda güçlü olduğun, neleri geliştirmen gerektiği belirlenir.
              </p>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-xl font-semibold text-white mb-4">⏱️ Deneme Sınavları</h3>
              <p className="text-slate-300">
                Gerçek sınav koşullarında deneme sınavlarına gir. Her soru için çözüm süresi ve metadata tutulur.
              </p>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-xl font-semibold text-white mb-4">📊 Akıllı Yönlendirme</h3>
              <p className="text-slate-300">
                Performans verilerinden yola çıkarak kişiselleştirilmiş çalışma planı ve strateji önerileri.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ErrorVault Access Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-slate-800/60 backdrop-blur-sm border-slate-700/50">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-white" />
              </div>
                             <CardTitle className="text-2xl text-white mb-3">
                 ErrorVault Modülüne Erişim
               </CardTitle>
               <p className="text-slate-400">
                 Rota platformunun deneme analizi modülü. Çözdüğün denemeleri yükle, AI ile analiz et.
               </p>
            </CardHeader>
            <CardContent className="px-6">
              <div className="space-y-4">
                <div className="relative">
                                     <User className="absolute left-4 top-4 w-5 h-5 text-purple-400" />
                                     <Input
                     type="text"
                     placeholder="User ID'nizi girin (örn: demo_user)"
                     value={userId}
                     onChange={(e) => setUserId(e.target.value)}
                     className="pl-12 h-12 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-500 focus:ring-purple-500"
                   />
                </div>
                                 <Button 
                   onClick={handleErrorVaultAccess}
                   className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium"
                 >
                  ErrorVault'a Erişim Sağla
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/30">
              <div className="text-4xl font-bold text-purple-400 mb-2">10K+</div>
              <div className="text-slate-300">Analiz Edilen Soru</div>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/30">
              <div className="text-4xl font-bold text-purple-400 mb-2">500+</div>
              <div className="text-slate-300">Aktif Kullanıcı</div>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/30">
              <div className="text-4xl font-bold text-purple-400 mb-2">95%</div>
              <div className="text-slate-300">Memnuniyet Oranı</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 mt-16 border-t border-slate-700/50">
        <div className="text-center">
                     <div className="flex items-center justify-center space-x-3 mb-4">
             <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Rota</span>
          </div>
          <p className="text-slate-400">&copy; 2024 Rota Platform. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
} 