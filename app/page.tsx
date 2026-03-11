// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "../lib/supabaseClient";
import Map from "../components/Map"; // 地図を復活！

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [mergedPokefutas, setMergedPokefutas] = useState<any[]>([]);

  // 1. ログイン状態の監視
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // 2. ログインできたら、データを取得して合体させる
  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    if (!session?.user?.id) return;

    try {
      // ① ポケふたマスター（図鑑）を取得
      const { data: masterData, error: masterError } = await supabase
        .from("pokefutas")
        .select("*")
        .order("id", { ascending: true });
      if (masterError) throw masterError;

      // ② 今ログインしている人の「チェックイン履歴」だけを取得
      const { data: checkinsData, error: checkinsError } = await supabase
        .from("user_checkins")
        .select("*")
        .eq("user_id", session.user.id);
      if (checkinsError) throw checkinsError;

      // ③ 図鑑と履歴を合体！
      const merged = (masterData || []).map((futa) => {
        // このポケふたのIDと一致する履歴があるか探す
        const checkin = (checkinsData || []).find((c) => c.pokefuta_id === futa.id);
        return {
          ...futa,
          visited: !!checkin, // 履歴があれば true になる
          user_image_url: checkin ? checkin.user_image_url : null,
          checkin_type: checkin ? checkin.checkin_type : null,
        };
      });

      setMergedPokefutas(merged);
    } catch (error) {
      console.error("Data fetch error:", error);
    }
  };

  // 3. 写真をアップロードした後の処理（履歴テーブルへの保存）
  const handleCheckIn = async (futaId: number, imageUrl: string) => {
    if (!session?.user?.id) return;

    try {
      // 古い pokefutas テーブルの更新ではなく、新しい user_checkins テーブルに追加（Insert）する
      const { error } = await supabase
        .from("user_checkins")
        .insert({
          user_id: session.user.id,
          pokefuta_id: futaId,
          user_image_url: imageUrl,
          checkin_type: "silver", // 今回は一旦すべてsilverとして記録
        });

      if (error) throw error;

      // 成功したら画面のデータを最新に更新
      await fetchData();
      alert("チェックインしました！📸");
    } catch (err) {
      console.error("Check-in error:", err);
      alert("チェックインデータの保存に失敗しました。");
    }
  };

  // --- ログインしていない時の画面 ---
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">ポケふたコレクター 🗺️</h1>
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={[]} />
        </div>
      </div>
    );
  }

  // --- ログインしている時の画面（地図表示） ---
  return (
    <main className="w-screen h-screen relative bg-gray-50">
      <button
        onClick={() => supabase.auth.signOut()}
        className="absolute top-4 right-4 z-10 bg-red-500 text-white px-4 py-2 rounded shadow text-sm font-bold hover:bg-red-600 transition"
      >
        ログアウト
      </button>
      
      {/* 復活した地図に、合体したデータを渡す */}
      <Map pokefutas={mergedPokefutas} onCheckIn={handleCheckIn} />
    </main>
  );
}