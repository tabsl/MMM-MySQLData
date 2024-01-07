Module.register("MMM-MySQLData", {
    defaults: {
        id: 1,
        host: "",
        port: 3306,
        username: "",
        password: "",
        database: "",
        values: [
            {
                "id": "",
                "title": "",
                "suffix": "",
                "prefix": "",
                "query": "",
                "styles": {}
            }
        ],
        data: {
            "id": "",
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
        this.sendSocketNotification("SET_CONFIG", {
            config: this.config
        });
        this.getDbData();
    },

    getDbData() {
        for (let data of this.config.values) {
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
        }
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "DATA_RESULT" && payload.instance === this.config.id) {
            this.processData(payload);
        }
    },

    processData: function (data) {
        console.log(data);
        if (data) {
            this.createOrUpdateWrapper(data);
            this.updateDom();
        }
    },

    wrappers: {},

    createOrUpdateWrapper: function (data) {
        let wrapper;
        var id = this.config.id + '_' + data.id;
        if (this.wrappers[id]) {
            wrapper = this.wrappers[id];
            wrapper.querySelector('.title').innerHTML = data.title;
            this.updateContent(wrapper.querySelector('.content'), data);
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
            if (parseFloat(data.rawValue) > parseFloat(data.styles[style])) {
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
