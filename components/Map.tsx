// components/Map.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { supabase } from "../lib/supabaseClient";
import imageCompression from "browser-image-compression";
import exifr from "exifr"; 

const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 36.2048, lng: 138.2529 };

// 2点間の距離を計算
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; 
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

type MapProps = {
  pokelids: {  // 変更：pokelids
    id: number; name: string; lat: number; lng: number; image_url: string; 
    user_image_url?: string; visited: boolean; checkin_type?: string; 
  }[];
  onCheckIn: (id: number, imageUrl: string, status: string) => void; 
};

export default function Map({ pokelids, onCheckIn }: MapProps) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedLid, setSelectedLid] = useState<MapProps["pokelids"][0] | null>(null); // 変更：Lid
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, lidId: number) => { // 変更：lidId
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    try {
      let checkinStatus = "silver"; 
      try {
        const gpsData = await exifr.gps(file);
        if (gpsData && gpsData.latitude && gpsData.longitude) {
          const targetLid = pokelids.find(l => l.id === lidId); // 変更：targetLid
          if (targetLid) {
            const distance = getDistance(gpsData.latitude, gpsData.longitude, targetLid.lat, targetLid.lng);
            console.log(`📸 写真のGPSとの距離: 約${Math.round(distance)}メートル`);
            
            if (distance <= 100) {
              checkinStatus = "gold";
            }
          }
        } else {
          console.log("⚠️ 写真にGPSデータが含まれていませんでした");
        }
      } catch (exifError) {
        console.log("EXIF読み取りエラー（GPSなし画像など）:", exifError);
      }

      const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1024, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      
      const fileName = `${Date.now()}_${compressedFile.name}`;
      const { error: uploadError } = await supabase.storage.from("checkins").upload(fileName, compressedFile);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("checkins").getPublicUrl(fileName);
      
      onCheckIn(lidId, publicUrlData.publicUrl, checkinStatus); // 変更：lidId
      setSelectedLid(null); // 変更：Lid
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
        
        {/* 変更：pokelids, lid */}
        {pokelids.map((lid) => {
          if (!lid || lid.lat == null || lid.lng == null) return null;
          return (
            <Marker key={lid.id} position={{ lat: lid.lat, lng: lid.lng }} onClick={() => setSelectedLid(lid)} icon={{ url: lid.user_image_url || lid.image_url || "https://placehold.co/100?text=No+Img", scaledSize: new window.google.maps.Size(50, 50) }} opacity={lid.visited ? 1.0 : 0.6} />
          );
        })}

        {/* 変更：selectedLid */}
        {selectedLid && (
          <InfoWindow position={{ lat: selectedLid.lat, lng: selectedLid.lng }} onCloseClick={() => setSelectedLid(null)}>
            <div className="text-center p-1 max-w-[200px]">
              <p className="font-bold text-sm mb-2 text-black">{selectedLid.name}</p>
              <div className="mb-3">
                <img src={selectedLid.user_image_url || selectedLid.image_url} alt={selectedLid.name} className={`w-32 h-32 object-cover rounded-md mx-auto ${selectedLid.visited ? "" : "grayscale"}`} />
              </div>
              
              {selectedLid.visited ? (
                <div className={`font-bold py-1 px-3 rounded-full inline-block border text-sm ${
                  selectedLid.checkin_type === "gold" 
                    ? "bg-yellow-100 text-yellow-700 border-yellow-400" 
                    : "bg-gray-100 text-gray-700 border-gray-300"
                }`}>
                  {selectedLid.checkin_type === "gold" ? "🥇 現地チェックイン！" : "🥈 写真チェックイン"}
                </div>
              ) : (
                <div className="w-full">
                  {isUploading ? (
                    <p className="text-sm text-blue-500 font-bold animate-pulse">写真をアップロード中...</p>
                  ) : (
                    <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition-colors w-full inline-block">
                      📸 写真を撮って登録
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, selectedLid.id)} />
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