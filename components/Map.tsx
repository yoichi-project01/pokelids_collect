// components/Map.tsx
"use client"; // これが重要！クライアントサイドでのみ動くことを宣言

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

// サンプルデータ：横浜のポケふた（ピカチュウ）など
const POKEFUTA_DATA = [
  { id: 1, name: "横浜・ピカチュウ", lat: 35.4526, lng: 139.6429 },
  { id: 2, name: "上野・ソーナンス", lat: 35.7145, lng: 139.7735 },
];

export default function Map() {
  return (
    // styleで高さを指定しないと地図が表示されないので注意！
    <MapContainer
      center={[35.6895, 139.6917]} // 初期の中心位置（東京）
      zoom={10}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%" }}
    >
      {/* OpenStreetMapのタイルを使用（著作権表示が必須） */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* データの数だけピンを立てる */}
      {POKEFUTA_DATA.map((futa) => (
        <Marker key={futa.id} position={[futa.lat, futa.lng]}>
          <Popup>
            <div className="text-center">
              <p className="font-bold text-lg">{futa.name}</p>
              <p className="text-sm text-gray-500">ここに行きましたか？</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}