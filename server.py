from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO,emit

app = Flask(__name__)
socketio = SocketIO(app)

@app.route('/')
def index():
    return render_template('test.html')

@app.route('/Ranking')
def ranking():
    return render_template('Ranking.html')

@app.route('/submit_score', methods=['POST'])
def submit_score():
    data = request.get_json()
    score = data.get('score')
    # スコアを処理する（例：データベースに保存するなど）
    print(f"Received score: {score}")
    return jsonify({'status': 'success', 'score': score})

@socketio.on("connect")
def handle_connect():
    print("connected")
    emit("message",{"data":"connected"})

if __name__ == '__main__':
    app.run(debug=True)