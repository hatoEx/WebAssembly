// ランキングデータを追加する関数
function renderRanking(rankingData) {
    const rankingList = document.getElementById("ranking-list");
    rankingList.innerHTML = ""; // リストをクリア

    // 配列のデータをリストに追加
    rankingData.forEach((player, index) => {
        const li = document.createElement("li");
        li.classList.add("ranking-item");

        li.innerHTML = `
            <span class="rank">${index + 1}</span>
            <span class="name">${player.name}</span>
            <span class="score">${player.score} 点</span>
        `;

        rankingList.appendChild(li);
    });
}

// テストデータ
const sampleRanking = [
    { name: "プレイヤーA", score: 12345 },
    { name: "プレイヤーB", score: 9876 },
    { name: "プレイヤーC", score: 6789 },
    { name: "プレイヤーD", score: 4321 },
    { name: "プレイヤーE", score: 2100 }
];

// ランキングデータを追加する関数の呼び出し
renderRanking(sampleRanking);


const socket = io.connect("http://" + document.domain + ":" + location.port );

socket.on('message', function(data) {
    console.log("connected: " + data.data);
});
