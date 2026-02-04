// app/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

// 型定義に visited を追加
type Pokefuta = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  image_url: string;
  visited: boolean;
};

export default function Home() {
  const [pokefutas, setPokefutas] = useState<Pokefuta[]>([]);

  // 地図コンポーネント
  const Map = useMemo(
    () =>
      dynamic(() => import("@/components/Map"), {
        loading: () => <p>地図を読み込み中...</p>,
        ssr: false,
      }),
    []
  );

  // データ取得
  const fetchPokefutas = async () => {
    const { data, error } = await supabase
      .from('pokehuta')
      .select('*')
      .order('id', { ascending: true }); // ID順に並べる

    if (error) console.error("エラー:", error);
    else setPokefutas(data || []);
  };

  useEffect(() => {
    fetchPokefutas();
  }, []);

  // ★チェックイン処理
  const handleCheckIn = async (id: number) => {
    // 1. Supabaseのデータを更新
    const { error } = await supabase
      .from('pokehuta')
      .update({ visited: true }) // visitedをtrueにする
      .eq('id', id);

    if (error) {
      alert("更新に失敗しました");
      console.error(error);
    } else {
      // 2. 画面上のデータも更新（再読み込み）
      fetchPokefutas();
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="w-full bg-red-600 p-4 text-white text-center font-bold text-xl z-10 shadow-md">
        ポケふた図鑑
      </div>
      <div className="w-full h-[calc(100vh-60px)] relative">
        {/* 地図にデータとチェックイン関数を渡す */}
        <Map pokefutas={pokefutas} onCheckIn={handleCheckIn} />
      </div>
    </main>
  );
}