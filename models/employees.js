const express = require('express');
const router = express.Router();
/*const { Employee } = require('../models'); // Employeeモデルをインポート*/
const authenticate = require('../middleware/authenticate'); // 認証ミドルウェアをインポート

// 従業員一覧を取得するエンドポイントはserver.jsに移動
module.exports = router; // ルーターをエクスポート
