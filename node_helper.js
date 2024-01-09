var NodeHelper = require("node_helper");
var mysql = require('mysql');

module.exports = NodeHelper.create({
	start: function () {
	},

	socketNotificationReceived: function (notification, payload) {
		if (notification === "SET_CONFIG") {
			this.config = payload.config;
			this.connection = mysql.createConnection({
				host: this.config.host,
				port: this.config.port,
				user: this.config.username,
				password: this.config.password,
				database: this.config.database,
			});
			this.connection.connect(function (error) {
				if (error) {
					console.error("Database connection error:", error.stack);
					self.sendSocketNotification("NOTIFICATION_ALERT", {
						title: "DATABASE CONNECTION ERROR",
						content: error.message
					});
					return;
				}
			});
		}
		if (notification === "GET_DATA") {
			this.getData(payload);
		}
	},

	getData: function (payload) {
		var self = this;
		var data = payload.config;
		this.connection.query(data.query, function (error, results, fields) {
			if (error) {
				console.error("Database query error:", error);
				self.sendSocketNotification("NOTIFICATION_ALERT", {
					title: "DATABASE QUERY ERROR",
					content: error.message + ' [' + data.query + ']'
				});
				return;
			}
			if (results.length > 0) {
				var value = '';
				if (data.praefix) {
					value += '<span class="praefix">' + data.praefix + '</span>';
				}
				value += '<span class="value">' + results[0].value + '</span>';
				if (data.suffix) {
					value += '<span class="suffix">' + data.suffix + '</span>';
				}
				self.sendSocketNotification("DATA_RESULT", {
					instance: payload.id,
					id: data.id,
					title: data.title,
					value: value,
					rawValue: results[0].value,
					styles: data.styles
				});
			} else {
				console.log("No data found");
			}
		});
	},

	stop: function () {
		this.connection.end();
	}
});
