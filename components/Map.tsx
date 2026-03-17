// components/Map.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api"; // 🌟 InfoWindowを削除
import { supabase } from "../lib/supabaseClient";
import imageCompression from "browser-image-compression";
import exifr from "exifr";

const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 36.2048, lng: 138.2529 };

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
  pokelids: { 
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
  const [selectedLid, setSelectedLid] = useState<MapProps["pokelids"][0] | null>(null);
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
        mapRef.current?.setZoom(15); // 🌟 スマホ用に少しズームを強めに
      },
      () => alert("位置情報の取得に失敗しました。")
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, lidId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    
    try {
      let checkinStatus = "silver"; 
      let debugMessage = "⚠️ 写真に位置情報(GPS)が含まれていませんでした！"; // 🌟追加：理由のテキスト
      try {
        const gpsData = await exifr.gps(file);
        if (gpsData && gpsData.latitude && gpsData.longitude) {
          const targetLid = pokelids.find(l => l.id === lidId); 
          if (targetLid) {
            const distance = getDistance(gpsData.latitude, gpsData.longitude, targetLid.lat, targetLid.lng);
            debugMessage = `📍 判定結果: ポケふたとの距離は約 ${Math.round(distance)} メートルです。`; // 🌟追加
            if (distance <= 100) {
              checkinStatus = "gold";
            } else {
              debugMessage += "\n※100メートル以上離れているため銀メダルになります。"; // 🌟追加
            }
          }
        }
      } catch (exifError) {
        console.log("EXIF読み取りエラー:", exifError);
      }

      alert(debugMessage); // 🌟追加：アップロードする前に理由を画面に出す！

      const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1024, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const fileName = `${Date.now()}_${compressedFile.name}`;
      const { error: uploadError } = await supabase.storage.from("checkins").upload(fileName, compressedFile);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("checkins").getPublicUrl(fileName);
      
      onCheckIn(lidId, publicUrlData.publicUrl, checkinStatus); 
      setSelectedLid(null); 
    } catch (err) {
      console.error("Upload error:", err);
      alert("画像のアップロードに失敗しました。");
    } finally {
      setIsUploading(false); 
    }
  };

  if (!isLoaded) return <div className="text-center p-10 font-bold mt-20">地図を読み込み中...</div>;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <GoogleMap 
        mapContainerStyle={containerStyle} 
        center={defaultCenter} 
        zoom={5} 
        onLoad={onLoad} 
        onUnmount={onUnmount} 
        // 🌟 スマホで邪魔になるGoogle純正のUIボタンを非表示にする
        options={{ disableDefaultUI: true, zoomControl: false, gestureHandling: 'greedy' }}
      >
        {currentPosition && (
          <Marker position={currentPosition} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#4285F4", fillOpacity: 1, strokeColor: "white", strokeWeight: 3 }} zIndex={999} />
        )}
        
        {pokelids.map((lid) => {
          if (!lid || lid.lat == null || lid.lng == null) return null;
          return (
            <Marker 
              key={lid.id} 
              position={{ lat: lid.lat, lng: lid.lng }} 
              onClick={() => {
                setSelectedLid(lid);
                // 🌟 ピンをタップしたら、その場所を中心に少し上にズラす（カードで隠れないように）
                mapRef.current?.panTo({ lat: lid.lat - 0.05, lng: lid.lng });
              }} 
              icon={{ url: lid.user_image_url || lid.image_url || "https://placehold.co/100?text=No+Img", scaledSize: new window.google.maps.Size(46, 46) }} 
              opacity={lid.visited ? 1.0 : 0.6} 
            />
          );
        })}
      </GoogleMap>

      {/* 🌟 スマホ向け現在地ボタン（右下に固定、ボトムシートが出ている時は少し上に逃げる） */}
      <button 
        onClick={handleCurrentLocation} 
        className={`absolute right-4 bg-white text-blue-600 p-3.5 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.15)] hover:bg-gray-50 transition-all z-10 border border-gray-100 ${selectedLid ? 'bottom-[340px]' : 'bottom-24'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6v1.5h-1.5V6h1.5Zm0 10.5h-1.5v-1.5h1.5v1.5Zm2.03-3.47-3 3a.75.75 0 0 1-1.06 0l-1.5-1.5a.75.75 0 0 1 1.06-1.06l.97.97 2.47-2.47a.75.75 0 0 1 1.06 1.06Z" clipRule="evenodd" /></svg>
      </button>

      {/* 📱 🌟 超重要：スマホ風 ボトムシート（下からスッと出てくるカード） */}
      <div 
        className={`absolute bottom-0 left-0 w-full bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-40 p-6 pt-4 transition-transform duration-300 pointer-events-auto ${selectedLid ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {selectedLid && (
          <>
            {/* 上部のスワイプバー（デザイン）と閉じる機能 */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-5 cursor-pointer" onClick={() => setSelectedLid(null)}></div>
            
            <div className="flex gap-4 items-center">
              <img src={selectedLid.user_image_url || selectedLid.image_url} alt={selectedLid.name} className={`w-24 h-24 object-cover rounded-2xl shadow-sm ${selectedLid.visited ? "" : "grayscale"}`} />
              <div className="flex-1">
                <h3 className="font-black text-xl text-gray-800 line-clamp-2 leading-tight">{selectedLid.name}</h3>
                <div className="mt-2">
                  {selectedLid.visited ? (
                    <span className={`font-bold py-1 px-3 rounded-full text-[11px] border shadow-sm ${selectedLid.checkin_type === "gold" ? "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-300" : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300"}`}>
                      {selectedLid.checkin_type === "gold" ? "🥇 現地チェックイン" : "🥈 写真チェックイン"}
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-500 font-bold py-1 px-3 rounded-full text-xs">未発見</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3 w-full pb-16"> {/* ナビゲーションバーに被らないようpb-16 */}
              {!selectedLid.visited && (
                <div className="w-full">
                  {isUploading ? (
                    <div className="bg-blue-50 text-blue-600 font-bold py-3.5 rounded-2xl text-center text-sm animate-pulse border border-blue-100">写真をアップロード中...</div>
                  ) : (
                    <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-md transition-colors w-full flex items-center justify-center gap-2 text-sm">
                      <span className="text-lg">📸</span> 写真を撮ってチェックイン
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, selectedLid.id)} />
                    </label>
                  )}
                </div>
              )}
              <a href={`/threads/lid/${selectedLid.id}`} className="bg-green-50 hover:bg-green-100 text-green-700 font-bold py-3.5 rounded-2xl text-center transition-colors border border-green-200 w-full flex items-center justify-center gap-2 text-sm shadow-sm">
                <span className="text-lg">💬</span> この場所の掲示板を見る
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}