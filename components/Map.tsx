// components/Map.tsx
"use client";

import { useState, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";

// 地図のコンテナスタイル（画面いっぱいに広げる）
const containerStyle = {
  width: "100%",
  height: "100%",
};

// 初期の中心座標（日本の真ん中あたり）
const center = {
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
  // Google Maps APIの読み込み
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  // 選択中の（ポップアップを開いている）ポケふた
  const [selectedFuta, setSelectedFuta] = useState<MapProps["pokefutas"][0] | null>(null);

  // マップがロードされた時の処理（必要ならここで現在地取得などを呼び出す）
  const onLoad = useCallback(function callback(map: google.maps.Map) {
    // 現在地取得などのロジックはここに書けます
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    // クリーンアップ処理
  }, []);

  if (!isLoaded) return <div className="text-center p-10">Googleマップを読み込み中...</div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={5}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        disableDefaultUI: false, // UI（ズームボタン等）を表示するか
        zoomControl: true,
      }}
    >
      {/* ポケふたのマーカーを表示 */}
      {pokefutas.map((futa) => {
        // データガード
        if (!futa || futa.lat == null || futa.lng == null) return null;

        return (
          <Marker
            key={futa.id}
            position={{ lat: futa.lat, lng: futa.lng }}
            onClick={() => setSelectedFuta(futa)} // クリックで選択状態にする
            icon={{
              url: futa.image_url || "https://placehold.co/100?text=No+Img",
              scaledSize: new window.google.maps.Size(50, 50), // アイコンサイズ
            }}
            // 訪問済みでなければ少し透明にするなどの工夫（GoogleMapはCSSフィルタが効きにくいため）
            opacity={futa.visited ? 1.0 : 0.7} 
          />
        );
      })}

      {/* 選択されたマーカーの上にInfoWindow（ポップアップ）を表示 */}
      {selectedFuta && (
        <InfoWindow
          position={{ lat: selectedFuta.lat, lng: selectedFuta.lng }}
          onCloseClick={() => setSelectedFuta(null)} // 閉じるボタンが押されたら選択解除
        >
          <div className="text-center p-1 max-w-[200px]">
            <p className="font-bold text-sm mb-2 text-black">{selectedFuta.name}</p>
            
            <div className="mb-3">
              {selectedFuta.image_url ? (
                <img 
                  src={selectedFuta.image_url} 
                  alt={selectedFuta.name} 
                  className={`w-32 h-32 object-cover rounded-md mx-auto ${selectedFuta.visited ? "" : "grayscale"}`} 
                  // InfoWindow内のimgにはTailwindのgrayscaleが効きます
                />
              ) : (
                <div className="w-32 h-32 bg-gray-200 rounded-md mx-auto flex items-center justify-center text-xs text-gray-500">画像なし</div>
              )}
            </div>

            {selectedFuta.visited ? (
              <div className="bg-green-100 text-green-700 font-bold py-1 px-3 rounded-full inline-block border border-green-300">
                🎉 訪問済み
              </div>
            ) : (
              <button
                onClick={() => {
                  onCheckIn(selectedFuta.id);
                  // 状態更新のため一度閉じる、または選択しなおす等の処理が必要な場合があります
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
  );
}