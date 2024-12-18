from flask import Flask, render_template, request, jsonify, session
from flask_socketio import SocketIO, emit
import uuid

app = Flask(__name__)
app.secret_key = 'test'  # 本番環境ではより安全なキーを使用してください
socketio = SocketIO(app)

# ランキングデータをリストとして保持
rankings_cpu = []
rankings_gpu = []

MAX_RANKINGS = 10  # 上位10のみ保持

def update_ranking(rankings, user_id, score):
    """
    ランキングを更新し、必要に応じてスコアを追加または更新し、
    上位10のみを保持する。
    """
    # ユーザーの既存のスコアを検索
    existing_entry = next((entry for entry in rankings if entry['name'] == user_id), None)
    
    if existing_entry:
        # 新しいスコアが既存のスコアより高い場合のみ更新
        if score > existing_entry['score']:
            existing_entry['score'] = score
            print(f"ユーザー {user_id} のスコアを更新しました: {score}")
    else:
        # 新しいエントリーを追加
        rankings.append({"name": user_id, "score": score})
        print(f"ユーザー {user_id} が新たにスコアを提出しました: {score}")
    
    # スコアでソート（降順）
    rankings.sort(key=lambda x: x['score'], reverse=True)
    
    # 上位10のみを保持
    if len(rankings) > MAX_RANKINGS:
        removed = rankings[MAX_RANKINGS:]
        rankings[:] = rankings[:MAX_RANKINGS]
        removed_ids = [entry['name'] for entry in removed]
        print(f"ランキングから除外されたユーザー: {removed_ids}")

@app.route('/')
def index():
    # セッションIDを生成して保存
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    return render_template('test.html')

@app.route('/Ranking')
def ranking():
    return render_template('Ranking.html')

@app.route('/Debag')
def debag():
    return render_template('Debag.html')

@app.route('/submit_score', methods=['POST'])
def submit_score():
    user_id = session.get('user_id')
    data = request.get_json()
    score = data.get('score')
    mode = data.get('mode')

    if user_id and score is not None and mode in ['cpu', 'gpu']:
        if mode == 'cpu':
            update_ranking(rankings_cpu, user_id, score)
        else:
            update_ranking(rankings_gpu, user_id, score)
        
        # 更新されたランキングデータを準備
        updated_rankings = {
            "cpu": rankings_cpu.copy(),
            "gpu": rankings_gpu.copy()
        }
        
        # すべての接続クライアントに更新されたランキングを送信
        socketio.emit("ranking_data", updated_rankings, namespace="/", to=None)

    return jsonify({'status': 'success', 'score': score})

@app.route('/debug_submit_score', methods=['POST'])
def debug_submit_score():
    data = request.get_json()
    name = data.get('name')
    score = data.get('score')
    mode = data.get('mode')

    # 入力バリデーション
    if not name:
        return jsonify({'status': 'error', 'message': '名前が提供されていません。'}), 400
    if score is None or not isinstance(score, int) or score < 0:
        return jsonify({'status': 'error', 'message': '有効なスコアが提供されていません。'}), 400
    if mode not in ['cpu', 'gpu']:
        return jsonify({'status': 'error', 'message': '有効なモードが選択されていません。'}), 400

    # 選択されたモードに応じてランキングに追加
    if mode == 'cpu':
        update_ranking(rankings_cpu, name, score)
    else:
        update_ranking(rankings_gpu, name, score)

    # 更新されたランキングデータを準備
    updated_rankings = {
        "cpu": rankings_cpu.copy(),
        "gpu": rankings_gpu.copy()
    }

    # すべての接続クライアントに更新されたランキングを送信
    socketio.emit("ranking_data", updated_rankings, namespace="/", to=None)

    return jsonify({'status': 'success', 'name': name, 'score': score, 'mode': mode})

@socketio.on("connect")
def handle_connect():
    print("クライアントが接続しました")
    # 現在のランキングデータを新しく接続したクライアントに送信
    emit("ranking_data", {
        "cpu": rankings_cpu,
        "gpu": rankings_gpu
    })

if __name__ == '__main__':
    socketio.run(app, debug=True)