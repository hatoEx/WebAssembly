const rankings_cpu = [
];

const rankings_gpu = [
];

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

const rankingTypeSelect = document.getElementById("ranking-type");

// 初期表示 (CPUランキング)
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

const socket = io.connect("http://" + document.domain + ":" + location.port);

socket.on("ranking_data", (data) => {
    console.log("Ranking data received: ", data);

    // 初期表示 (CPUランキング)
    renderRanking(data.cpu);

    // セレクトボックスの変更イベントに応じてランキングを切り替え
    rankingTypeSelect.addEventListener("change", () => {
        const selectedType = rankingTypeSelect.value;

        if (selectedType === "cpu") {
            renderRanking(data.cpu);
        } else if (selectedType === "gpu") {
            renderRanking(data.gpu);
        }
    });
});
