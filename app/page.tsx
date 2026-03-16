// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "../lib/supabaseClient";
import Map from "../components/Map";

// ==========================================
// 定数定義：全国47都道府県のリスト
// ==========================================
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
  // --- 状態管理 ---
  const [session, setSession] = useState<any>(null); // ログイン情報
  const [mergedPokelids, setMergedPokelids] = useState<any[]>([]); // 図鑑と履歴を合体させたデータ

  // 画面の表示モード（"map"=地図表示, "gallery"=図鑑表示）
  const [viewMode, setViewMode] = useState<"map" | "gallery">("map");
  // フィルター状態（未訪問、金メダルなど）
  const [filter, setFilter] = useState<"all" | "visited" | "unvisited" | "gold" | "silver">("all");
  // 選択中の都道府県コード（"all"なら全国表示）
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>("all");

  // ==========================================
  // 初期化処理
  // ==========================================
  
  // アプリ起動時にログイン状態をチェックする
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // ログインできたら、データベースから情報を引っ張ってくる
  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  // ==========================================
  // データ取得・保存の関数
  // ==========================================

  // データベースから「ポケふた一覧」と「ユーザーのチェックイン履歴」を取得し、合体させる関数
  const fetchData = async () => {
    if (!session?.user?.id) return;

    try {
      // ① 全国のポケふたマスターデータを取得
      const { data: masterData, error: masterError } = await supabase
        .from("pokelids")
        .select("*")
        .order("id", { ascending: true });
      if (masterError) throw masterError;

      // ② 現在ログインしているユーザーの「チェックイン履歴」を取得
      const { data: checkinsData, error: checkinsError } = await supabase
        .from("user_checkins")
        .select("*")
        .eq("user_id", session.user.id);
      if (checkinsError) throw checkinsError;

      // ③ 図鑑データとチェックイン履歴を「ID」をキーにして合体！
      const merged = (masterData || []).map((lid) => {
        const checkin = (checkinsData || []).find((c) => c.pokelid_id === lid.id);
        return {
          ...lid,
          visited: !!checkin, // 履歴があればtrue（訪問済み）
          user_image_url: checkin ? checkin.user_image_url : null, // ユーザーが撮った写真
          checkin_type: checkin ? checkin.checkin_type : null,     // gold か silver か
        };
      });

      setMergedPokelids(merged);
    } catch (error) {
      console.error("Data fetch error:", error);
    }
  };

  // 写真アップロード後に呼ばれ、データベースにチェックイン記録を保存する関数
  const handleCheckIn = async (lidId: number, imageUrl: string, status: string = "silver") => {
    if (!session?.user?.id) return;

    try {
      // user_checkins テーブルに新しい行を追加（Insert）
      const { error } = await supabase
        .from("user_checkins")
        .insert({
          user_id: session.user.id,
          pokelid_id: lidId,
          user_image_url: imageUrl,
          checkin_type: status, // GPS判定結果（gold/silver）を保存
        });

      if (error) throw error;
      
      // 保存に成功したら、画面を最新の状態に更新する
      await fetchData();

      // 獲得したメダルに応じてアラートを出し分ける
      if (status === "gold") {
        alert("現地チェックイン達成！🥇 金メダルを獲得しました！");
      } else {
        alert("写真チェックイン完了！📸 銀メダルを獲得しました！");
      }
    } catch (err) {
      console.error("Check-in error:", err);
      alert("チェックインデータの保存に失敗しました。");
    }
  };

  // ==========================================
  // UI
  // ==========================================

  // --- ログインしていない時の画面（ログインフォーム） ---
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

  // --- 達成度の計算 ---
  const totalPokelids = mergedPokelids.length; // 全ポケふたの数（444）
  const visitedPokelids = mergedPokelids.filter((lid) => lid.visited).length; // 訪問済みの数
  const progressPercentage = totalPokelids > 0 ? Math.round((visitedPokelids / totalPokelids) * 100) : 0;

  // --- フィルター処理 ---
  // ユーザーが選択した「状態（未訪問など）」と「都道府県」の条件に合うものだけを絞り込む
  const filteredPokelids = mergedPokelids.filter((lid) => {
    // 状態（メダル色など）の絞り込み
    let statusMatch = true;
    if (filter === "visited") statusMatch = lid.visited;
    if (filter === "unvisited") statusMatch = !lid.visited;
    if (filter === "gold") statusMatch = lid.checkin_type === "gold";
    if (filter === "silver") statusMatch = lid.checkin_type === "silver";

    // 都道府県の絞り込み（IDの最初の桁を1000で割ることで都道府県コードを割り出す。例:13001÷1000=13）
    let prefMatch = true;
    if (selectedPrefecture !== "all") {
      const lidPrefCode = Math.floor(lid.id / 1000).toString();
      prefMatch = lidPrefCode === selectedPrefecture;
    }

    // 両方の条件をクリアしたデータだけを残す
    return statusMatch && prefMatch;
  });

  // --- メイン画面（ログイン中） ---
  return (
    <main className="w-screen h-screen relative bg-gray-50 overflow-hidden flex flex-col">
      
      {/* 🟢 ヘッダー領域（上に固定） */}
      <div className="absolute top-0 left-0 w-full z-20 pointer-events-none">
        
        {/* プログレスバー（進捗状況） */}
        {totalPokelids > 0 && (
          <div className="mx-auto mt-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg w-11/12 max-w-sm border border-gray-100 pointer-events-auto">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-extrabold text-gray-700">図鑑コンプリート率</span>
              <span className="text-lg font-black text-blue-600">
                {visitedPokelids} <span className="text-sm text-gray-500 font-normal">/ {totalPokelids}箇所</span>
              </span>
            </div>
            {/* バーのゲージ部分 */}
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* 絞り込み（フィルター）ボタン群 */}
        <div className="w-full overflow-x-auto whitespace-nowrap px-4 py-3 mt-1 pointer-events-auto no-scrollbar flex items-center gap-2">
          
          {/* 都道府県選択ドロップダウン */}
          <select
            value={selectedPrefecture}
            onChange={(e) => setSelectedPrefecture(e.target.value)}
            className="px-3 py-2 rounded-full text-sm font-bold shadow border border-gray-200 bg-white text-gray-700 outline-none cursor-pointer hover:bg-gray-50 flex-shrink-0"
          >
            <option value="all">🗾 全国</option>
            {PREFECTURES.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>

          {/* 特定の都道府県が選ばれている時だけ表示される「掲示板」へのリンク */}
          {selectedPrefecture !== "all" && (
            <a
              href={`/threads/${selectedPrefecture}`}
              className="px-4 py-2 rounded-full text-sm font-bold shadow bg-gradient-to-r from-green-400 to-green-600 text-white flex-shrink-0 hover:from-green-500 hover:to-green-700 transition-all flex items-center gap-1"
            >
              💬 ご当地掲示板
            </a>
          )}

          {/* 状態（訪問・メダル）フィルターボタン */}
          {[
            { id: "all", label: "すべて" },
            { id: "unvisited", label: "未訪問" },
            { id: "visited", label: "訪問済み" },
            { id: "gold", label: "🥇 金" },
            { id: "silver", label: "🥈 銀" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-4 py-2 rounded-full text-sm font-bold shadow transition-colors flex-shrink-0 ${
                filter === f.id
                  ? "bg-blue-600 text-white border border-blue-600"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ログアウトボタン */}
      <button
        onClick={() => supabase.auth.signOut()}
        className="absolute top-4 right-4 z-30 bg-red-500 text-white px-3 py-1.5 rounded shadow text-xs font-bold hover:bg-red-600 transition pointer-events-auto"
      >
        ログアウト
      </button>

      {/* メインコンテンツ領域（地図 or 図鑑） */}
      <div className="flex-1 w-full h-full pt-32 pb-20">
        
        {viewMode === "map" ? (
          /* 地図モード：コンポーネントにフィルター済みのデータを渡す */
          <Map pokelids={filteredPokelids} onCheckIn={handleCheckIn} />
        ) : (
          /* 図鑑モード：画像をグリッド（格子状）に並べて表示 */
          <div className="h-full overflow-y-auto px-4 pb-10">
            {filteredPokelids.length === 0 ? (
              <p className="text-center text-gray-500 mt-10 font-bold">該当するポケふたがありません。</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredPokelids.map((lid) => (
                  <div key={lid.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col items-center relative">
                    
                    <div className="relative w-full aspect-square mb-2 bg-gray-50 rounded-lg overflow-hidden">
                      {/* 訪問済みなら自分が撮った写真、未訪問なら公式画像をモノクロにして表示 */}
                      <img
                        src={lid.visited && lid.user_image_url ? lid.user_image_url : lid.image_url}
                        alt={lid.name}
                        className={`w-full h-full object-cover transition-all duration-300 ${
                          lid.visited ? "scale-105" : "grayscale opacity-40 scale-95"
                        }`}
                      />
                      {/* メダルバッジの表示 */}
                      {lid.visited && (
                        <div className="absolute -top-2 -right-2 text-2xl drop-shadow-md">
                          {lid.checkin_type === "gold" ? "🥇" : "🥈"}
                        </div>
                      )}
                    </div>

                    {/* 名前とステータステキスト */}
                    <p className="text-xs font-bold text-gray-800 text-center line-clamp-1">{lid.name}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {lid.visited ? (lid.checkin_type === "gold" ? "現地チェックイン" : "写真チェックイン") : "未発見"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🟢 フッター領域（地図と図鑑の切り替えトグル） */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 bg-white p-1 rounded-full shadow-xl border border-gray-200 flex pointer-events-auto">
        <button
          onClick={() => setViewMode("map")}
          className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
            viewMode === "map" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          🗺️ 地図
        </button>
        <button
          onClick={() => setViewMode("gallery")}
          className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
            viewMode === "gallery" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          📖 図鑑
        </button>
      </div>

    </main>
  );
}