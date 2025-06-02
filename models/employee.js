// models/employee.js
'use strict';
const { Model, DataTypes } = require('sequelize');

class Employee extends Model {
  static associate(models) {
    Employee.belongsTo(models.User, { foreignKey: 'userId' });
    Employee.hasMany(models.Application, { foreignKey: 'employeeId' });
  }
}

const initEmployee = (sequelize) => {
  Employee.init({
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    furigana: {
      type: DataTypes.STRING,
      allowNull: false
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: false
    },
    birthdate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    nearestStation: {
      type: DataTypes.STRING,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Employee',
    tableName: 'employees', // テーブル名を指定
    timestamps: true // タイムスタンプを有効にする
  });
  
  return Employee;
};

module.exports = initEmployee; // 初期化関数をエクスポート
