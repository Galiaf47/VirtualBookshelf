var models = require('../models');

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('library', {
		model: DataTypes.STRING
	}, {
		timestamps: false,
		classMethods: classMethods
	});
};

var classMethods = {
	getWholeLibrary: function(libraryId) {
		var Library = this;

		var promise = Library.find({
			where: {id: libraryId},
			include: [{
				model: models.Section,
				include: [models.Book]
			}]
		}, {raw: false});

		return promise;
	}
};
