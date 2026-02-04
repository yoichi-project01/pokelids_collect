// components/Map.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "100%",
};

// 日本の中心あたり
const defaultCenter = {
  lat: 36.2048,
  lng: 138.2529,
};

type MapProps = {
  pokefutas: { 
    id: number; 
    name: string; 
    lat: number; 
    lng: number; 
    image_url: string; 
    visited: boolean;
  }[];
  onCheckIn: (id: number) => void;
};

export default function Map({ pokefutas, onCheckIn }: MapProps) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedFuta, setSelectedFuta] = useState<MapProps["pokefutas"][0] | null>(null);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // 現在地を取得して移動する関数
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("お使いのブラウザは位置情報をサポートしていません");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentPosition(pos);
        mapRef.current?.panTo(pos); // 地図を現在地に移動
        mapRef.current?.setZoom(14); // 少しズームする
      },
      () => {
        alert("位置情報の取得に失敗しました。スマホの設定で位置情報をONにしてください。");
      }
    );
  };

  if (!isLoaded) return <div className="text-center p-10">Googleマップを読み込み中...</div>;

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={5}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          fullscreenControl: false,
          streetViewControl: false, // スマホで見やすくするため不要なボタンを消す
          mapTypeControl: false,
        }}
      >
        {/* 現在地の青い丸 */}
        {currentPosition && (
          <Marker
            position={currentPosition}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#4285F4", // Googleブルー
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 2,
            }}
            zIndex={999} // 他のピンより上に表示
          />
        )}

        {/* ポケふたのマーカー */}
        {pokefutas.map((futa) => {
          if (!futa || futa.lat == null || futa.lng == null) return null;
          return (
            <Marker
              key={futa.id}
              position={{ lat: futa.lat, lng: futa.lng }}
              onClick={() => setSelectedFuta(futa)}
              icon={{
                url: futa.image_url || "https://placehold.co/100?text=No+Img",
                scaledSize: new window.google.maps.Size(50, 50),
              }}
              opacity={futa.visited ? 1.0 : 0.6} // 訪問済みでないなら少し薄く
            />
          );
        })}

        {/* 選択時のポップアップ */}
        {selectedFuta && (
          <InfoWindow
            position={{ lat: selectedFuta.lat, lng: selectedFuta.lng }}
            onCloseClick={() => setSelectedFuta(null)}
          >
            <div className="text-center p-1 max-w-[200px]">
              <p className="font-bold text-sm mb-2 text-black">{selectedFuta.name}</p>
              <div className="mb-3">
                {selectedFuta.image_url ? (
                  <img src={selectedFuta.image_url} alt={selectedFuta.name} className={`w-32 h-32 object-cover rounded-md mx-auto ${selectedFuta.visited ? "" : "grayscale"}`} />
                ) : (
                  <div className="w-32 h-32 bg-gray-200 rounded-md mx-auto flex items-center justify-center text-xs text-gray-500">画像なし</div>
                )}
              </div>
              {selectedFuta.visited ? (
                <div className="bg-green-100 text-green-700 font-bold py-1 px-3 rounded-full inline-block border border-green-300">🎉 訪問済み</div>
              ) : (
                <button
                  onClick={() => {
                    onCheckIn(selectedFuta.id);
                    setSelectedFuta({ ...selectedFuta, visited: true });
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition-colors w-full"
                >
                  📍 ここに行った！
                </button>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* 現在地へ移動するボタン（右下に配置） */}
      <button
        onClick={handleCurrentLocation}
        className="absolute bottom-6 right-4 bg-white text-gray-700 p-3 rounded-full shadow-lg hover:bg-gray-100 transition-colors z-10 border border-gray-300"
        title="現在地へ移動"
      >
        {/* ターゲットアイコンのSVG */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
      </button>
    </div>
  );
}