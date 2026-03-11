// components/Map.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { supabase } from "../lib/supabaseClient";
import imageCompression from "browser-image-compression"; // 画像圧縮ツールを追加

const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 36.2048, lng: 138.2529 };

type MapProps = {
  pokefutas: { 
    id: number; name: string; lat: number; lng: number; image_url: string; 
    user_image_url?: string; visited: boolean; checkin_type?: string; 
  }[];
  onCheckIn: (id: number, imageUrl: string) => void;
};

export default function Map({ pokefutas, onCheckIn }: MapProps) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedFuta, setSelectedFuta] = useState<MapProps["pokefutas"][0] | null>(null);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);
  const onUnmount = useCallback(() => { mapRef.current = null; }, []);

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return alert("お使いのブラウザは位置情報をサポートしていません");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCurrentPosition(pos);
        mapRef.current?.panTo(pos);
        mapRef.current?.setZoom(14);
      },
      () => alert("位置情報の取得に失敗しました。")
    );
  };

  // 画像アップロード処理（圧縮機能つき！）
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, futaId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    try {
      // 1. 画像の圧縮設定（最大300KB、最大幅1024pxに小さくする）
      const options = {
        maxSizeMB: 0.3, 
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      
      // 圧縮実行！
      const compressedFile = await imageCompression(file, options);
      
      // 2. 圧縮された画像をSupabaseにアップロード
      const fileName = `${Date.now()}_${compressedFile.name}`;
      const { error: uploadError } = await supabase.storage.from("checkins").upload(fileName, compressedFile);
      if (uploadError) throw uploadError;

      // 3. 画像のURLを取得して親(page.tsx)に渡す
      const { data: publicUrlData } = supabase.storage.from("checkins").getPublicUrl(fileName);
      onCheckIn(futaId, publicUrlData.publicUrl);
      setSelectedFuta(null); 
    } catch (err) {
      console.error("Upload error:", err);
      alert("画像のアップロードに失敗しました。");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isLoaded) return <div className="text-center p-10 font-bold">地図を読み込み中...</div>;

  return (
    <div className="relative w-full h-full">
      <GoogleMap mapContainerStyle={containerStyle} center={defaultCenter} zoom={5} onLoad={onLoad} onUnmount={onUnmount} options={{ disableDefaultUI: false, zoomControl: true, fullscreenControl: false, streetViewControl: false, mapTypeControl: false }}>
        {currentPosition && (
          <Marker position={currentPosition} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#4285F4", fillOpacity: 1, strokeColor: "white", strokeWeight: 2 }} zIndex={999} />
        )}
        {pokefutas.map((futa) => {
          if (!futa || futa.lat == null || futa.lng == null) return null;
          return (
            <Marker key={futa.id} position={{ lat: futa.lat, lng: futa.lng }} onClick={() => setSelectedFuta(futa)} icon={{ url: futa.user_image_url || futa.image_url || "https://placehold.co/100?text=No+Img", scaledSize: new window.google.maps.Size(50, 50) }} opacity={futa.visited ? 1.0 : 0.6} />
          );
        })}
        {selectedFuta && (
          <InfoWindow position={{ lat: selectedFuta.lat, lng: selectedFuta.lng }} onCloseClick={() => setSelectedFuta(null)}>
            <div className="text-center p-1 max-w-[200px]">
              <p className="font-bold text-sm mb-2 text-black">{selectedFuta.name}</p>
              <div className="mb-3">
                <img src={selectedFuta.user_image_url || selectedFuta.image_url} alt={selectedFuta.name} className={`w-32 h-32 object-cover rounded-md mx-auto ${selectedFuta.visited ? "" : "grayscale"}`} />
              </div>
              {selectedFuta.visited ? (
                <div className="bg-green-100 text-green-700 font-bold py-1 px-3 rounded-full inline-block border border-green-300">🎉 訪問済み</div>
              ) : (
                <div className="w-full">
                  {isUploading ? (
                    <p className="text-sm text-blue-500 font-bold animate-pulse">写真をアップロード中...</p>
                  ) : (
                    <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition-colors w-full inline-block">
                      📸 写真を撮って登録
                      {/* capture="environment" を付けると、スマホでは直接外カメが起動します！ */}
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, selectedFuta.id)} />
                    </label>
                  )}
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
      <button onClick={handleCurrentLocation} className="absolute bottom-6 right-4 bg-white text-gray-700 p-3 rounded-full shadow-lg hover:bg-gray-100 transition-colors z-10 border border-gray-300">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
      </button>
    </div>
  );
}