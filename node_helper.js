var NodeHelper = require("node_helper");
var mysql = require('mysql');

module.exports = NodeHelper.create({
	start: function () {
	},

	socketNotificationReceived: function (notification, payload) {
		if (notification === "SET_CONFIG") {
			this.config = payload.config;

			this.pool = mysql.createPool({
				connectionLimit: 10,
				connectTimeout: 20000,
				host: this.config.host,
				port: this.config.port,
				user: this.config.username,
				password: this.config.password,
				database: this.config.database,
			});
		}
		if (notification === "GET_DATA") {
			this.getData(payload);
		}
	},
	getData: function (payload) {
		var self = this;
		var data = payload.config;

		this.pool.getConnection(function (err, connection) {
			if (err) {
				console.error("MMM-MySQLData connection error:", err);
				self.sendSocketNotification("NOTIFICATION_ALERT", {
					title: "DATABASE CONNECTION ERROR",
					content: err.message
				});
				return;
			}
			connection.query(data.query, function (error, results, fields) {
				connection.release();
				if (self.config.debug) {
					console.log("MMM-MySQLData query: " + data.query);
				}
				if (error) {
					console.error("MMM-MySQLData query error: ", error);
					self.sendSocketNotification("NOTIFICATION_ALERT", {
						title: "DATABASE QUERY ERROR",
						content: error.message + ' [' + data.query + ']'
					});
					return;
				}
				if (results.length > 0) {
					if (self.config.debug) {
						console.log("MMM-MySQLData query result: " + results[0].value);
					}
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
						index: data.index,
						title: data.title,
						value: value,
						rawValue: results[0].value,
						styles: data.styles
					});
				} else {
					console.log("MMM-MySQLData query: no data");
				}
			});
		});
	},

	stop: function () {
		this.pool.end(function (err) {
		});
	}
});
