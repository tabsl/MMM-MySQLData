Module.register("MMM-MySQLData", {
	defaults: {
		id: 1,
		debug: true,
		wait: 0,
		host: "",
		port: 3306,
		username: "",
		password: "",
		database: "",
		values: [
			{
				"id": "",
				"index": "",
				"title": "",
				"suffix": "",
				"prefix": "",
				"query": "",
				"styles": {}
			}
		],
		data: {
			"id": "",
			"index": "",
			"title": "",
			"value": "",
			"rawValue": "",
			"styles": {}
		}
	},

	getStyles() {
		return [`${this.name}.css`];
	},

	start: function () {
		this.dataQueue = [];
		setTimeout(() => {
			this.sendSocketNotification("SET_CONFIG", {
				config: this.config
			});
			this.getDbData();
		}, this.config.wait);
	},

	getDbData() {
		Object.entries(this.config.values).forEach(([key, data], index) => {
			data.index = index;
			this.sendSocketNotification("GET_DATA", {
				id: this.config.id,
				config: data
			});
			setInterval(() => {
				this.sendSocketNotification("GET_DATA", {
					id: this.config.id,
					config: data
				});
			}, data.interval);
		});
		this.config.dataQueueTotal = this.config.values.length;
	},

	socketNotificationReceived: function (notification, payload) {
		if (notification === "DATA_RESULT" && payload.instance === this.config.id) {
			this.dataQueue.push(payload);
			this.processDataQueue();
		}
		if (notification === "NOTIFICATION") {
			this.sendNotification('SHOW_ALERT', {type: 'notification', title: payload.title, message: payload.content})
		}
		if (notification === "NOTIFICATION_ALERT") {
			this.sendNotification('SHOW_ALERT', {title: payload.title, message: payload.content})
		}
	},

	processDataQueue: function () {
		this.dataQueue.sort((a, b) => a.index - b.index);
		if (this.config.dataQueueTotal == 0 || (this.config.dataQueueTotal > 0 && this.dataQueue.length == this.config.dataQueueTotal)) {
			this.dataQueue.forEach(data => {
				this.processData(data);
			});
			this.dataQueue = [];
			this.config.dataQueueTotal = 0;
		}
	},

	processData: function (data) {
		if (this.config.debug) {
			console.log("MMM-MySQLData data:");
			console.log(data);
		}
		if (data) {
			this.createOrUpdateWrapper(data);
			// performance dom building
			setInterval(() => {
				this.updateDom();
			}, 2000);
		}
	},

	wrappers: {},

	createOrUpdateWrapper: function (data) {
		let wrapper;
		var id = this.config.id + '_' + data.id;
		if (this.wrappers[id]) {
			wrapper = this.wrappers[id];
			if (data.title) {
				wrapper.querySelector('.module-header').innerHTML = data.title;
			}
			this.updateContent(wrapper.querySelector('.module-content'), data);
		} else {
			wrapper = document.createElement("div");
			wrapper.id = id;
			wrapper.className = "wrapper";

			if (data.title) {
				let header = document.createElement("header");
				header.className = "module-header";
				header.innerHTML = data.title;
				wrapper.appendChild(header);
			}

			let content = document.createElement("div");
			content.className = "module-content";
			this.updateContent(content, data);
			wrapper.appendChild(content);

			this.wrappers[id] = wrapper;
		}
	},

	updateContent: function (contentElement, data) {
		contentElement.innerHTML = data.value;
		contentElement.className = "module-content";

		for (let style in data.styles) {
			var $segments = data.styles[style].split(/\s+/);
			var operator = $segments[0];
			var leftOperand = data.rawValue;
			var rightOperand = $segments[1];
			if (!isNaN(parseFloat(leftOperand)) && !isNaN(parseFloat(rightOperand))) {
				leftOperand = parseFloat(leftOperand);
				rightOperand = parseFloat(rightOperand);
			}
			var operators = {
				'==': (a, b) => a == b,
				'===': (a, b) => a === b,
				'>': (a, b) => a > b,
				'<': (a, b) => a < b,
				'>=': (a, b) => a >= b,
				'<=': (a, b) => a <= b,
				'!=': (a, b) => a != b,
				'!==': (a, b) => a !== b
			};
			if (operators[operator] && operators[operator](leftOperand, rightOperand)) {
				contentElement.classList.add(style);
			}
		}
	},

	getDom: function () {
		var container = document.createElement("div");
		for (let key in this.wrappers) {
			container.appendChild(this.wrappers[key]);
		}

		return container;
	},

	getHeader: function () {
		return this.data.header;
	},
});
