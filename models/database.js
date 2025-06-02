const { Sequelize } = require('sequelize');

// データベース接続の設定
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'project.db' // データベースファイルを指定
});

// 接続の確認
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

// 接続をテスト
testConnection();

module.exports = sequelize;
