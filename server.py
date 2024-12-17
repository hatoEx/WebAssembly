from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('test.html')

@app.route('/submit_score', methods=['POST'])
def submit_score():
    data = request.get_json()
    score = data.get('score')
    # スコアを処理する（例：データベースに保存するなど）
    print(f"Received score: {score}")
    return jsonify({'status': 'success', 'score': score})

if __name__ == '__main__':
    app.run(debug=True)