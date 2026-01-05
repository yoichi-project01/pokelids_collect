// app/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

export default function Home() {
  // SSR（サーバーサイドレンダリング）を無効化してMapコンポーネントを読み込む
  const Map = useMemo(
    () =>
      dynamic(() => import("@/components/Map"), { // パスは実際の構成に合わせてください
        loading: () => <p>地図を読み込み中...</p>,
        ssr: false,
      }),
    []
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      {/* ヘッダー部分 */}
      <div className="w-full bg-red-600 p-4 text-white text-center font-bold text-xl shadow-md z-10">
        ポケふた図鑑
      </div>

      {/* 地図エリア：画面いっぱいに表示 */}
      <div className="w-full h-[calc(100vh-60px)] relative">
        <Map />
      </div>
    </main>
  );
}