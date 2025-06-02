'use strict';
const { Model, DataTypes } = require('sequelize');

class User extends Model {
  static associate(models) {
    User.hasMany(models.Project, { foreignKey: 'userId' });
    User.hasMany(models.Employee, { foreignKey: 'userId' });
  }
}

const initUser = (sequelize) => {
  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true, // PRIMARY KEY AUTOINCREMENT を表現
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, // UNIQUE 制約
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false, // NOT NULL 制約
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'user', // DEFAULT 'user'
      },
      companyName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      representativeName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users', // テーブル名を指定
      timestamps: true, // createdAt と updatedAt を自動生成
    }
  );
  
  return User;
};

module.exports = initUser; // 初期化関数をエクスポート
