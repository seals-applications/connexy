'use strict';
const { Model, DataTypes } = require('sequelize');

class Application extends Model {
  static associate(models) {
    Application.belongsTo(models.Project, { foreignKey: 'projectId' });
    Application.belongsTo(models.User, { foreignKey: 'applicantUserId' }); // エイリアスなし
    Application.belongsTo(models.Employee, { foreignKey: 'employeeId' });
  }
}

const initApplication = (sequelize) => {
  Application.init({
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Projects',
        key: 'id'
      }
    },
    applicantUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Employees',
        key: 'id'
      }
    },
    appliedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Application',
    tableName: 'applications', // テーブル名を指定
    timestamps: true // タイムスタンプを有効にする
  });
  
  return Application;
};

module.exports = initApplication; // 初期化関数をエクスポート
