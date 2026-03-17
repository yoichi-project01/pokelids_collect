"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

// 都道府県コードと名前の対応表
const PREFECTURES: Record<string, string> = {
  "1": "北海道", "2": "青森県", "3": "岩手県", "4": "宮城県", "5": "秋田県", "6": "山形県", "7": "福島県", "8": "茨城県",
  "9": "栃木県", "10": "群馬県", "11": "埼玉県", "12": "千葉県", "13": "東京都", "14": "神奈川県", "15": "新潟県", "16": "富山県",
  "17": "石川県", "18": "福井県", "19": "山梨県", "20": "長野県", "21": "岐阜県", "22": "静岡県", "23": "愛知県", "24": "三重県",
  "25": "滋賀県", "26": "京都府", "27": "大阪府", "28": "兵庫県", "29": "奈良県", "30": "和歌山県", "31": "鳥取県", "32": "島根県",
  "33": "岡山県", "34": "広島県", "35": "山口県", "36": "徳島県", "37": "香川県", "38": "愛媛県", "39": "高知県", "40": "福岡県",
  "41": "佐賀県", "42": "長崎県", "43": "熊本県", "44": "大分県", "45": "宮崎県", "46": "鹿児島県", "47": "沖縄県"
};

export default function ThreadPage({ params }: { params: Promise<{ prefCode: string }> }) {
  const router = useRouter();
  
  // URLから都道府県コードを取得（React 19対応）
  const resolvedParams = use(params);
  const prefCode = resolvedParams.prefCode;
  const prefName = PREFECTURES[prefCode] || "不明な地域";

  const [session, setSession] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // ログイン状態の確認
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }, []);

  // 画面を開いた時にコメントを取得
  useEffect(() => {
    fetchComments();
  }, [prefCode]);

  // Supabaseから該当する都道府県のコメントを取得
  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("prefecture_comments")
      .select("*")
      .eq("prefecture_code", prefCode)
      .order("created_at", { ascending: true }); // 古い順に並べる

    if (error) {
      console.error("Fetch error:", error);
    } else {
      setComments(data || []);
    }
  };

  // コメントを送信する処理
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !session?.user?.id) return;

    const { error } = await supabase
      .from("prefecture_comments")
      .insert({
        prefecture_code: prefCode,
        user_id: session.user.id,
        message: newMessage,
      });

    if (error) {
      console.error("Send error:", error);
      alert("送信に失敗しました");
    } else {
      setNewMessage(""); // 入力欄をクリア
      fetchComments(); // 最新のコメントを再取得して表示
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-blue-600 text-white p-4 shadow-md flex items-center gap-4 fixed top-0 w-full z-10">
        <button onClick={() => router.push("/")} className="text-white font-bold hover:underline">
          ← 地図に戻る
        </button>
        <h1 className="text-lg font-bold flex-1">{prefName}のコレクター掲示板 💬</h1>
      </header>

      {/* コメント一覧エリア */}
      <main className="flex-1 overflow-y-auto pt-20 pb-24 px-4 max-w-2xl mx-auto w-full">
        {comments.length === 0 ? (
          <p className="text-center text-gray-500 mt-10">まだ書き込みがありません。最初の情報をシェアしよう！</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment, index) => {
              const isMine = session?.user?.id === comment.user_id;
              return (
                <div key={comment.id || index} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                  <span className="text-xs text-gray-400 mb-1 mx-2">
                    {isMine ? "あなた" : "匿名コレクター"} • {new Date(comment.created_at).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className={`px-4 py-2 rounded-2xl max-w-[85%] shadow-sm ${
                    isMine ? "bg-blue-500 text-white rounded-br-none" : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
                  }`}>
                    {comment.message}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 入力フォーム */}
      <footer className="bg-white border-t border-gray-200 p-4 fixed bottom-0 w-full">
        <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`${prefName}の情報を書き込む...`}
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-blue-500 shadow-inner"
            disabled={!session}
          />
          <button
            type="submit"
            disabled={!session || !newMessage.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            送信
          </button>
        </form>
      </footer>
    </div>
  );
}