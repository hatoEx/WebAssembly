from flask import Flask, render_template, request, jsonify, session
from flask_socketio import SocketIO, emit
import uuid

app = Flask(__name__)
app.secret_key = 'test'  # 任意の文字列を設定してください
socketio = SocketIO(app)

rankings_cpu = {}
rankings_gpu = {}

@app.route('/')
def index():
    # セッションIDを生成して保存
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    return render_template('test.html')

@app.route('/Ranking')
def ranking():
    return render_template('Ranking.html')

@app.route('/submit_score', methods=['POST'])
def submit_score():
    user_id = session.get('user_id')
    data = request.get_json()
    score = data.get('score')
    mode = data.get('mode')

    if user_id:
        (rankings_cpu if mode == 'cpu' else rankings_gpu)[user_id] = score  # CPU/GPUに応じてランキングに格納
        print(f"User {user_id} submitted score: {score} to {mode} rankings")
    
    return jsonify({'status': 'success', 'score': score})


@socketio.on("connect")
def handle_connect():
    print("connected")
    # クライアントにランキングデータを送信
    emit("ranking_data", {
        "cpu": rankings_cpu,
        "gpu": rankings_gpu
    })

if __name__ == '__main__':
    socketio.run(app, debug=True)
