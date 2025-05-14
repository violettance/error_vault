"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Upload } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { useState } from "react"

export default function Home() {
  const [date, setDate] = useState<Date>()
  const [files, setFiles] = useState<File[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900 px-4 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            <span className="text-[#8b5cf6]">Deneme</span> Takipçim
          </h1>
          <div className="flex gap-3">
            <Button className="bg-[#8b5cf6] hover:bg-[#7c3aed]">Yeni Deneme Girişi</Button>
            <Button variant="outline" disabled className="relative">
              Detaylı Analiz
              <span className="absolute -right-2 -top-2 rounded-full bg-[#8b5cf6] px-2 py-0.5 text-xs font-semibold text-white">
                Yakında
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h2 className="mb-6 text-2xl font-bold">Deneme Sınavı Sonuçlarını Gir</h2>

        {/* Exam Details Card */}
        <Card className="mb-6 border-gray-800 bg-gray-900">
          <CardHeader>
            <CardTitle>Genel Deneme Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="exam-type">Sınav Türü</Label>
              <Select>
                <SelectTrigger id="exam-type" className="border-gray-700 bg-gray-800">
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent className="border-gray-700 bg-gray-800">
                  <SelectItem value="tyt">TYT</SelectItem>
                  <SelectItem value="ayt">AYT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exam-date">Sınav Tarihi</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-gray-700 bg-gray-800 text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: tr }) : <span>Tarih Seçiniz</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto border-gray-700 bg-gray-800 p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="bg-gray-800" />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exam-name">Deneme Adı / Yayın (Opsiyonel)</Label>
              <Input id="exam-name" placeholder="Örn: Özdebir TYT Deneme 1" className="border-gray-700 bg-gray-800" />
            </div>
          </CardContent>
        </Card>

        {/* Subject Results Cards */}
        <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Turkish Card */}
          <SubjectCard title="Türkçe" />

          {/* Social Sciences Card */}
          <SubjectCard title="Sosyal Bilimler" />

          {/* Mathematics Card */}
          <SubjectCard title="Temel Matematik" />

          {/* Science Card */}
          <SubjectCard title="Fen Bilimleri" />
        </div>

        {/* Wrong Questions Upload Card */}
        <Card className="mb-6 border-gray-800 bg-gray-900">
          <CardHeader>
            <CardTitle>Yanlış ve Boş Soruların Fotoğraflarını Yükle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex w-full items-center justify-center">
                <label
                  htmlFor="file-upload"
                  className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gray-800 hover:bg-gray-700"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="mb-3 h-10 w-10 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-400">
                      <span className="font-semibold">Fotoğraf yüklemek için tıklayın</span> veya sürükleyip bırakın
                    </p>
                    <p className="text-xs text-gray-400">PNG, JPG veya JPEG (MAX. 10MB)</p>
                  </div>
                  <Input
                    id="file-upload"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/*"
                  />
                </label>
              </div>

              {/* File Preview */}
              {files.length > 0 && (
                <div className="mt-4 w-full">
                  <h3 className="mb-2 text-sm font-medium">Yüklenen Dosyalar:</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="relative flex flex-col items-center overflow-hidden rounded-lg border border-gray-700 bg-gray-800 p-2"
                      >
                        <div className="h-20 w-full overflow-hidden rounded">
                          <img
                            src={URL.createObjectURL(file) || "/placeholder.svg"}
                            alt={`Preview ${index}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p className="mt-2 w-full truncate text-xs">{file.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="bg-[#8b5cf6] px-8 py-6 text-lg font-medium hover:bg-[#7c3aed]">Sonuçları Kaydet</Button>
        </div>
      </main>
    </div>
  )
}

interface SubjectCardProps {
  title: string
}

function SubjectCard({ title }: SubjectCardProps) {
  const [correct, setCorrect] = useState<number>(0)
  const [wrong, setWrong] = useState<number>(0)
  const [blank, setBlank] = useState<number>(0)

  const net = correct - wrong * 0.25

  return (
    <Card className="border-gray-800 bg-gray-900">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${title}-correct`}>Doğru</Label>
          <Input
            id={`${title}-correct`}
            type="number"
            min="0"
            className="border-gray-700 bg-gray-800"
            value={correct}
            onChange={(e) => setCorrect(Number.parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${title}-wrong`}>Yanlış</Label>
          <Input
            id={`${title}-wrong`}
            type="number"
            min="0"
            className="border-gray-700 bg-gray-800"
            value={wrong}
            onChange={(e) => setWrong(Number.parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${title}-blank`}>Boş</Label>
          <Input
            id={`${title}-blank`}
            type="number"
            min="0"
            className="border-gray-700 bg-gray-800"
            value={blank}
            onChange={(e) => setBlank(Number.parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="pt-2 text-sm">
          <span className="font-medium text-[#8b5cf6]">Net:</span> <span className="font-bold">{net.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
