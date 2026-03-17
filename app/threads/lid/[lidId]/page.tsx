"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

export default function PokelidThreadPage({ params }: { params: Promise<{ lidId: string }> }) {
  const router = useRouter();
  
  // URLからポケふたのIDを取得
  const resolvedParams = use(params);
  const lidId = parseInt(resolvedParams.lidId, 10);

  const [session, setSession] = useState<any>(null);
  const [pokelid, setPokelid] = useState<any>(null); // 🌟 このポケふた自身のデータ
  const [comments, setComments] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }, []);

  useEffect(() => {
    if (lidId) {
      fetchPokelid();
      fetchComments();
    }
  }, [lidId]);

  // 🌟 ポケふたの名前や画像を取得する
  const fetchPokelid = async () => {
    const { data } = await supabase.from("pokelids").select("*").eq("id", lidId).single();
    if (data) setPokelid(data);
  };

  // コメント一覧を取得する
  const fetchComments = async () => {
    const { data } = await supabase
      .from("pokelid_comments") // 🌟 新しく作った個別用テーブルから取得
      .select("*")
      .eq("pokelid_id", lidId)
      .order("created_at", { ascending: true });
    setComments(data || []);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !session?.user?.id) return;

    const { error } = await supabase.from("pokelid_comments").insert({
      pokelid_id: lidId,
      user_id: session.user.id,
      message: newMessage,
    });

    if (!error) {
      setNewMessage("");
      fetchComments();
    } else {
      alert("送信失敗: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-600 text-white p-4 shadow-md flex items-center gap-4 fixed top-0 w-full z-10">
        <button onClick={() => router.back()} className="text-white font-bold hover:underline">
          ← 戻る
        </button>
        <h1 className="text-lg font-bold flex-1 line-clamp-1">
          {pokelid ? `${pokelid.name} の掲示板` : "読み込み中..."}
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto pt-20 pb-24 px-4 max-w-2xl mx-auto w-full">
        {/* 🌟 ポケふたの画像を上部に表示 */}
        {pokelid && (
          <div className="flex flex-col items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <img src={pokelid.image_url} alt={pokelid.name} className="w-32 h-32 object-cover rounded-lg mb-2" />
            <p className="text-sm text-gray-500 font-bold">この場所の情報をシェアしよう！</p>
          </div>
        )}

        {comments.length === 0 ? (
          <p className="text-center text-gray-500 mt-4">まだ書き込みがありません。</p>
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

      <footer className="bg-white border-t border-gray-200 p-4 fixed bottom-0 w-full">
        <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto flex gap-2">
          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="情報を書き込む..." className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-blue-500 shadow-inner" disabled={!session} />
          <button type="submit" disabled={!session || !newMessage.trim()} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow hover:bg-blue-700 disabled:bg-gray-400 transition-colors">送信</button>
        </form>
      </footer>
    </div>
  );
}