const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// 公式都道府県コード（1〜47）に準拠したリスト
const prefectures = [
    ["1", "hokkaido"], ["2", "aomori"], ["3", "iwate"], ["4", "miyagi"],
    ["5", "akita"], ["6", "yamagata"], ["7", "fukushima"], ["8", "ibaraki"],
    ["9", "tochigi"], ["10", "gunma"], ["11", "saitama"], ["12", "chiba"],
    ["13", "tokyo"], ["14", "kanagawa"], ["15", "niigata"], ["16", "toyama"],
    ["17", "ishikawa"], ["18", "fukui"], ["19", "yamanashi"], ["20", "nagano"],
    ["21", "gifu"], ["22", "shizuoka"], ["23", "aichi"], ["24", "mie"],
    ["25", "shiga"], ["26", "kyoto"], ["27", "osaka"], ["28", "hyogo"],
    ["29", "nara"], ["30", "wakayama"], ["31", "tottori"], ["32", "shimane"],
    ["33", "okayama"], ["34", "hiroshima"], ["35", "yamaguchi"], ["36", "tokushima"],
    ["37", "kagawa"], ["38", "ehime"], ["39", "kochi"], ["40", "fukuoka"],
    ["41", "saga"], ["42", "nagasaki"], ["43", "kumamoto"], ["44", "oita"],
    ["45", "miyazaki"], ["46", "kagoshima"], ["47", "okinawa"]
];

// サーバーに優しくするための待機関数
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function scrapeData() {
    let csvContent = "id,name,lat,lng,image_url\n";
    let totalCount = 0;

    console.log("🚀 全国のポケふたデータ（座標含む）を本気で取得します！");
    console.log("※詳細ページにもアクセスするため、完了まで数分かかります。コーヒーでも飲んでお待ちください☕\n");

    for (const [pref_code, pref_name] of prefectures) {
        const listUrl = `https://local.pokemon.jp/manhole/${pref_name}.html`;
        console.log(`[${pref_code.padStart(2, '0')}] ${pref_name} を取得中...`);

        try {
            const listRes = await axios.get(listUrl, { validateStatus: () => true });
            if (listRes.status !== 200) continue;

            const $list = cheerio.load(listRes.data);
            
            // aタグのclass="manhole-detail"をすべて見つける
            const items = $list('a.manhole-detail');

            let count = 1;
            for (let i = 0; i < items.length; i++) {
                const el = items[i];
                
                // 1. 詳細ページのURLと、画像のURLを取得
                const detailHref = $list(el).attr('href'); // 例: /manhole/desc/445/?is_modal=1
                const imgUrl = $list(el).find('img').attr('src');
                
                // 2. 名前を取得（空白や改行を綺麗に削除）
                let name = $list(el).text().replace(/\s+/g, '').trim();

                if (!detailHref || !imgUrl) continue;

                // URLを完全な形に直す
                const fullImgUrl = imgUrl.startsWith('/') ? "https://local.pokemon.jp" + imgUrl : imgUrl;
                const detailUrl = "https://local.pokemon.jp" + detailHref;

                // --- 🌟 ここが追加された魔法！詳細ページに潜入して座標を取る！ ---
                const detailRes = await axios.get(detailUrl, { validateStatus: () => true });
                const $detail = cheerio.load(detailRes.data);

                let lat = "0", lng = "0";
                // 詳細ページ内のGoogle Mapsリンクを探す
                const mapLink = $detail('a[href*="maps.google"], a[href*="google.com/maps"]').attr('href');
                if (mapLink) {
                    const match = mapLink.match(/@([0-9.]+),([0-9.]+)/) || mapLink.match(/ll=([0-9.]+),([0-9.]+)/) || mapLink.match(/q=([0-9.]+),([0-9.]+)/);
                    if (match) {
                        lat = match[1];
                        lng = match[2];
                    }
                }

                // IDの生成（例：北海道の1個目＝1001）
                const futaId = parseInt(`${pref_code}${String(count).padStart(3, '0')}`);
                csvContent += `${futaId},${name},${lat},${lng},${fullImgUrl}\n`;
                count++;
                totalCount++;

                // 🚨 サーバー攻撃にならないよう、1件ごとに1秒待つ（超重要！）
                await sleep(1000); 
            }

            console.log(`  ✅ ${count - 1} 件 取得完了！`);

        } catch (error) {
            console.log(`  ❌ エラー: ${error.message}`);
        }
    }

    fs.writeFileSync("all_japan_pokefuta_final.csv", "\uFEFF" + csvContent, 'utf8');
    console.log(`\n🎉🎉 完全制覇！合計 ${totalCount} 件の完璧なデータを all_japan_pokefuta_final.csv に保存しました！`);
}

scrapeData();