// 初期ランキングデータをローカルストレージから取得。なければ空配列を設定
const rankings_cpu = JSON.parse(localStorage.getItem("rankings_cpu")) || [];
const rankings_gpu = JSON.parse(localStorage.getItem("rankings_gpu")) || [];

// ランキングをレンダリングする関数
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

// セレクトボックスと初期表示の設定
const rankingTypeSelect = document.getElementById("ranking-type");

// 初期表示 (ローカルストレージから取得したCPUランキング)
renderRanking(rankings_cpu);

// セレクトボックスの変更イベントに応じてランキングを切り替え
rankingTypeSelect.addEventListener("change", () => {
    const selectedType = rankingTypeSelect.value;

    if (selectedType === "cpu") {
        renderRanking(rankings_cpu);
    } else if (selectedType === "gpu") {
        renderRanking(rankings_gpu);
    }
});

// ソケット接続の設定
const socket = io.connect("http://" + document.domain + ":" + location.port);

socket.on("ranking_data", (data) => {
    console.log("Ranking data received: ", data);

    // 受け取ったデータでローカルストレージを更新
    if (data.cpu) {
        rankings_cpu.length = 0; // 既存のデータをクリア
        data.cpu.forEach(player => rankings_cpu.push(player));
        localStorage.setItem("rankings_cpu", JSON.stringify(rankings_cpu));
    }

    if (data.gpu) {
        rankings_gpu.length = 0; // 既存のデータをクリア
        data.gpu.forEach(player => rankings_gpu.push(player));
        localStorage.setItem("rankings_gpu", JSON.stringify(rankings_gpu));
    }

    // 現在選択されているランキングタイプに応じて表示を更新
    const selectedType = rankingTypeSelect.value;
    if (selectedType === "cpu") {
        renderRanking(rankings_cpu);
    } else if (selectedType === "gpu") {
        renderRanking(rankings_gpu);
    }
});
