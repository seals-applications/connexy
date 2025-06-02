'use strict';
const { Model, DataTypes } = require('sequelize');

class Project extends Model {
  static associate(models) {
    Project.belongsTo(models.User, { foreignKey: 'userId' });
    Project.hasMany(models.Application, { foreignKey: 'projectId' });
  }
}

const initProject = (sequelize) => {
  Project.init({
    projectName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    prefecture: {
      type: DataTypes.STRING,
      allowNull: false
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    workingDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    projectDescription: {
      type: DataTypes.STRING,
      allowNull: false
    },
    skills: {
      type: DataTypes.STRING,
      allowNull: false
    },
    reward: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: false
    },
    projectDetail: {
      type: DataTypes.STRING,
      allowNull: false
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    projectGenre: {
      type: DataTypes.STRING,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Project'
  });
  
  return Project;
};

module.exports = initProject; // ここで関数をエクスポート
