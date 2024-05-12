var NodeHelper = require("node_helper");
var mysql = require("mysql");

module.exports = NodeHelper.create({
	pools: {}, start: function() {
	},

	socketNotificationReceived: function(notification, payload) {
		if (notification === "SET_CONFIG") {
			this.config = payload.config;
			const configId = payload.config.id;

			// create pool
			if (!this.pools[configId]) {
				this.pools[configId] = mysql.createPool({
					connectionLimit: 10, connectTimeout: 20000, host: this.config.host, port: this.config.port, user: this.config.username, password: this.config.password, database: this.config.database
				});
				console.log(`Pool created for config ID: ${configId}`);
			}
		}

		if (notification === "GET_DATA") {
			this.getData(payload);
		}
	},

	// get data
	getData: function(payload) {
		const configId = payload.id;
		var self = this;

		var pool = this.pools[configId];
		if (!pool) {
			console.error("No pool found for this ID: " + configId);
			return;
		}

		pool.getConnection(function(err, connection) {
			if (err) {
				console.error("MMM-MySQLData connection error:", err);
				self.sendSocketNotification("NOTIFICATION_ALERT", {
					title: "DATABASE CONNECTION ERROR", content: err.message
				});
				return;
			}
			connection.query(payload.config.query, function(error, results, fields) {
				connection.release();
				if (self.config.debug) {
					console.log("MMM-MySQLData query: " + payload.config.query);
				}
				if (error) {
					console.error("MMM-MySQLData query error: ", error);
					self.sendSocketNotification("NOTIFICATION_ALERT", {
						title: "DATABASE QUERY ERROR", content: error.message + " [" + payload.config.query + "]"
					});
					return;
				}
				if (results.length > 0) {
					if (self.config.debug) {
						console.log("MMM-MySQLData query result: " + results[0].value);
					}
					var value = "";
					if (payload.config.praefix) {
						value += "<span class=\"praefix\">" + payload.config.praefix + "</span>";
					}
					value += "<span class=\"value\">" + results[0].value + "</span>";
					if (payload.config.suffix) {
						value += "<span class=\"suffix\">" + payload.config.suffix + "</span>";
					}
					self.sendSocketNotification("DATA_RESULT", {
						instance: payload.id, id: payload.config.id, index: payload.config.index, title: payload.config.title, value: value, rawValue: results[0].value, styles: payload.config.styles
					});
				} else {
					console.log("MMM-MySQLData query: no data");
				}
			});
		});
	},

	stop: function() {
		// close all pools
		Object.keys(this.pools).forEach((id) => {
			this.pools[id].end(function(err) {
				console.log(`Pool closed for config ID: ${configId}`);
				if (err) console.log("Error closing pool for ID: " + id, err);
			});
		});
	}
});
