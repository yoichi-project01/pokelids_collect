// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "../lib/supabaseClient";
import Map from "../components/Map";

const PREFECTURES = [
  { code: "1", name: "北海道" }, { code: "2", name: "青森県" }, { code: "3", name: "岩手県" }, { code: "4", name: "宮城県" },
  { code: "5", name: "秋田県" }, { code: "6", name: "山形県" }, { code: "7", name: "福島県" }, { code: "8", name: "茨城県" },
  { code: "9", name: "栃木県" }, { code: "10", name: "群馬県" }, { code: "11", name: "埼玉県" }, { code: "12", name: "千葉県" },
  { code: "13", name: "東京都" }, { code: "14", name: "神奈川県" }, { code: "15", name: "新潟県" }, { code: "16", name: "富山県" },
  { code: "17", name: "石川県" }, { code: "18", name: "福井県" }, { code: "19", name: "山梨県" }, { code: "20", name: "長野県" },
  { code: "21", name: "岐阜県" }, { code: "22", name: "静岡県" }, { code: "23", name: "愛知県" }, { code: "24", name: "三重県" },
  { code: "25", name: "滋賀県" }, { code: "26", name: "京都府" }, { code: "27", name: "大阪府" }, { code: "28", name: "兵庫県" },
  { code: "29", name: "奈良県" }, { code: "30", name: "和歌山県" }, { code: "31", name: "鳥取県" }, { code: "32", name: "島根県" },
  { code: "33", name: "岡山県" }, { code: "34", name: "広島県" }, { code: "35", name: "山口県" }, { code: "36", name: "徳島県" },
  { code: "37", name: "香川県" }, { code: "38", name: "愛媛県" }, { code: "39", name: "高知県" }, { code: "40", name: "福岡県" },
  { code: "41", name: "佐賀県" }, { code: "42", name: "長崎県" }, { code: "43", name: "熊本県" }, { code: "44", name: "大分県" },
  { code: "45", name: "宮崎県" }, { code: "46", name: "鹿児島県" }, { code: "47", name: "沖縄県" }
];

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [mergedPokelids, setMergedPokelids] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"map" | "gallery">("map");
  const [filter, setFilter] = useState<"all" | "visited" | "unvisited" | "gold" | "silver">("all");
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    try {
      const { data: masterData, error: masterError } = await supabase.from("pokelids").select("*").order("id", { ascending: true });
      if (masterError) throw masterError;

      const { data: checkinsData, error: checkinsError } = await supabase.from("user_checkins").select("*").eq("user_id", session.user.id);
      if (checkinsError) throw checkinsError;

      const merged = (masterData || []).map((lid) => {
        const checkin = (checkinsData || []).find((c) => c.pokelid_id === lid.id);
        return {
          ...lid, visited: !!checkin, user_image_url: checkin ? checkin.user_image_url : null, checkin_type: checkin ? checkin.checkin_type : null,
        };
      });
      setMergedPokelids(merged);
    } catch (error) {
      console.error("Data fetch error:", error);
    }
  };

  const handleCheckIn = async (lidId: number, imageUrl: string, status: string = "silver") => {
    if (!session?.user?.id) return;
    try {
      const { error } = await supabase.from("user_checkins").insert({ user_id: session.user.id, pokelid_id: lidId, user_image_url: imageUrl, checkin_type: status });
      if (error) throw error;
      await fetchData();
      if (status === "gold") alert("現地チェックイン達成！🥇 金メダルを獲得しました！");
      else alert("写真チェックイン完了！📸 銀メダルを獲得しました！");
    } catch (err: any) {
      console.error("Check-in error:", err);
      alert(`保存失敗の詳細: ${err.message || "不明なエラー"}`);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 mb-2">ポケふた<br/>コレクター</h1>
            <p className="text-xs text-gray-500 font-bold">君だけの図鑑を完成させよう！</p>
          </div>
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#2563eb', brandAccent: '#1d4ed8' }, radii: { borderRadiusButton: '12px', buttonBorderRadius: '12px', inputBorderRadius: '12px' } } } }} providers={[]} />
        </div>
      </div>
    );
  }

  const totalPokelids = mergedPokelids.length;
  const visitedPokelids = mergedPokelids.filter((lid) => lid.visited).length;
  const progressPercentage = totalPokelids > 0 ? Math.round((visitedPokelids / totalPokelids) * 100) : 0;

  const filteredPokelids = mergedPokelids.filter((lid) => {
    let statusMatch = true;
    if (filter === "visited") statusMatch = lid.visited;
    if (filter === "unvisited") statusMatch = !lid.visited;
    if (filter === "gold") statusMatch = lid.checkin_type === "gold";
    if (filter === "silver") statusMatch = lid.checkin_type === "silver";

    let prefMatch = true;
    if (selectedPrefecture !== "all") {
      prefMatch = Math.floor(lid.id / 1000).toString() === selectedPrefecture;
    }
    return statusMatch && prefMatch;
  });

  return (
    // 変更点①：h-screen を h-[100dvh] に変更（スマホの実際の表示領域にピタッと合わせる魔法の設定です）
    <main className="w-screen h-[100dvh] relative bg-gray-50 flex flex-col overflow-hidden">
      
      {/* 📱 スマホ用 コンパクトヘッダー */}
      <div className="absolute top-0 left-0 w-full z-20 pointer-events-none pb-4 bg-gradient-to-b from-white via-white/80 to-transparent">
        
        {/* プログレスバー */}
        {totalPokelids > 0 && (
          <div className="mx-4 mt-4 pt-4 pointer-events-auto">
            <div className="flex justify-between items-baseline mb-1.5 px-1">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">コンプリート率</span>
              <span className="text-sm font-black text-blue-600">{visitedPokelids} <span className="text-[10px] text-gray-400 font-normal">/ {totalPokelids}</span></span>
            </div>
            <div className="w-full bg-gray-200/80 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          </div>
        )}

        {/* フィルターボタン群 */}
        <div className="w-full overflow-x-auto whitespace-nowrap px-4 py-3 pointer-events-auto no-scrollbar flex items-center gap-2">
          <select value={selectedPrefecture} onChange={(e) => setSelectedPrefecture(e.target.value)} className="px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border border-gray-200 bg-white text-gray-700 outline-none cursor-pointer flex-shrink-0">
            <option value="all">🗾 全国</option>
            {PREFECTURES.map((p) => (<option key={p.code} value={p.code}>{p.name}</option>))}
          </select>

          {selectedPrefecture !== "all" && (
            <a href={`/threads/${selectedPrefecture}`} className="px-3 py-1.5 rounded-full text-xs font-bold shadow-sm bg-green-500 text-white flex-shrink-0 flex items-center gap-1">
              💬 掲示板
            </a>
          )}

          {[
            { id: "all", label: "すべて" }, { id: "unvisited", label: "未発見" }, { id: "visited", label: "発見" }, { id: "gold", label: "🥇" }, { id: "silver", label: "🥈" },
          ].map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id as any)} className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-colors flex-shrink-0 ${filter === f.id ? "bg-gray-800 text-white" : "bg-white text-gray-600 border border-gray-200"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => supabase.auth.signOut()} className="absolute top-6 right-4 mt-2 z-30 bg-white/80 backdrop-blur-sm text-gray-500 px-2.5 py-1.5 rounded-full shadow-sm text-[10px] border border-gray-200 font-bold pointer-events-auto">
        ログアウト
      </button>

      {/* メインコンテンツ領域 */}
      {/* 変更点②：フッターが大きくなった分、下部の余白（pb）を増やしました */}
      <div className="flex-1 w-full h-full pb-16"> 
        {viewMode === "map" ? (
          <Map pokelids={filteredPokelids} onCheckIn={handleCheckIn} />
        ) : (
          <div className="h-full overflow-y-auto px-4 pt-32 pb-10">
            {filteredPokelids.length === 0 ? (
              <div className="flex flex-col items-center justify-center mt-20 opacity-50">
                <span className="text-4xl mb-3">🔍</span>
                <p className="font-bold text-gray-500 text-sm">該当するポケふたがありません</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filteredPokelids.map((lid) => (
                  <div key={lid.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2.5 flex flex-col items-center relative">
                    <div className="relative w-full aspect-square mb-2 bg-gray-50 rounded-xl overflow-hidden">
                      <img src={lid.visited && lid.user_image_url ? lid.user_image_url : lid.image_url} alt={lid.name} className={`w-full h-full object-cover transition-all duration-300 ${lid.visited ? "" : "grayscale opacity-30"}`} />
                      {lid.visited && (
                        <div className="absolute top-1 right-1 text-xl drop-shadow-md bg-white/80 backdrop-blur-sm rounded-full w-7 h-7 flex items-center justify-center">
                          {lid.checkin_type === "gold" ? "🥇" : "🥈"}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] font-extrabold text-gray-800 text-center line-clamp-1 w-full">{lid.name}</p>
                    <a href={`/threads/lid/${lid.id}`} className="mt-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-[10px] font-bold py-1.5 rounded-lg w-full text-center transition-colors">
                      💬 掲示板
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 📱 🌟 変更点③：フッターに下部余白（pb-6）を追加して、画面外にはみ出さないようにしました */}
      <div className="absolute bottom-0 left-0 w-full z-40 bg-white border-t border-gray-100 flex justify-around items-center pb-2 pt-1 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pointer-events-auto">
        <button onClick={() => setViewMode("map")} className={`flex-1 py-1 flex flex-col items-center transition-all ${viewMode === "map" ? "text-blue-600 scale-105" : "text-gray-400"}`}>
          <span className="text-xl mb-1 drop-shadow-sm leading-none">📍</span>
          <span className="text-[9px] font-black tracking-wide">マップ</span>
        </button>
        <button onClick={() => setViewMode("gallery")} className={`flex-1 py-1 flex flex-col items-center transition-all ${viewMode === "gallery" ? "text-blue-600 scale-105" : "text-gray-400"}`}>
          <span className="text-xl mb-1 drop-shadow-sm leading-none">📖</span>
          <span className="text-[9px] font-black tracking-wide">図鑑</span>
        </button>
      </div>

    </main>
  );
}