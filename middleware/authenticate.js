// middleware/authenticate.js
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
    const token = req.cookies.token; // クッキーからトークンを取得

    if (!token) {
        return res.status(401).json({ message: 'トークンが必要です' });
    }

    jwt.verify(token, 'your_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'トークンが無効です' });
        }
        req.user = user; // ユーザー情報をリクエストに追加
        next(); // 次のミドルウェアまたはルートハンドラに進む
    });
};

module.exports = authenticate;
