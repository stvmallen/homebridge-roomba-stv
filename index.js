let Service;
let Characteristic;

const dorita980 = require('dorita980');
const nodeCache = require('node-cache');
const timeout = require('promise-timeout').timeout;
const STATUS = "status";

const roombaAccessory = function (log, config) {
    this.log = log;
    this.name = config.name;
    this.model = config.model;
    this.blid = config.blid;
    this.robotpwd = config.robotpwd;
    this.ipaddress = config.ipaddress;
    this.firmware = "N/A";
    this.autoRefreshEnabled = config.autoRefreshEnabled | true;
    this.pollingInterval = config.pollingInterval | 60;
    this.cacheTTL = config.cacheTTL | 30;

    this.accessoryInfo = new Service.AccessoryInformation();
    this.switchService = new Service.Switch(this.name);
    this.batteryService = new Service.BatteryService(this.name);

    this.cache = new nodeCache({stdTTL: this.cacheTTL, checkPeriod: 5, useClones: false});

    this.timer;

    this.autoRefresh();
};

roombaAccessory.prototype = {
    setState(powerOn, callback) {
        let that = this;
        let roomba = new dorita980.Local(this.blid, this.robotpwd, this.ipaddress);

        this.cache.del(STATUS);

        if (powerOn) {
            that.log("Starting Roomba");

            roomba.on('connect', () => {
                roomba.start().then(() => {
                    setTimeout(() => {
                        that.log("Roomba is running");

                        roomba.end();
                    }, 2000);

                    callback();
                }).catch((error) => {
                    that.log("Roomba failed: %s", error.message);

                    roomba.end();

                    callback(error);
                });
            });
        } else {
            that.log("Roomba pause and dock");

            roomba.on("connect", () => {
                roomba.pause().then(() => {
                    that.log("Roomba is pausing");

                    callback();

                    that.log("Roomba paused, returning to Dock");

                    let checkStatus = delay => {
                        setTimeout(() => {
                            roomba.getRobotState(["cleanMissionStatus"]).then((state => {
                                switch (state.cleanMissionStatus.phase) {
                                    case "stop":
                                        that.log("Roomba has stopped, issuing dock request");

                                        roomba.dock().then(((response) => {
                                            roomba.end();

                                            that.log("Roomba docking");
                                        })).catch((error) => {
                                            that.log("Roomba failed: %s", error.message);
                                        });

                                        break;
                                    case "run":
                                        that.log("Roomba is still running. Will check again in 3 seconds");

                                        checkStatus(delay);

                                        break;
                                    default:
                                        roomba.end();

                                        that.log("Roomba is not running");

                                        break;
                                }

                            })).catch(error => {
                                that.log(error);

                                roomba.end();
                            });
                        }, delay);
                    };

                    checkStatus(3000);

                }).catch((error) => {
                    that.log("Roomba failed: %s", error.message);

                    roomba.end();

                    callback(error);
                });
            });
        }
    },

    getRunningStatus(callback) {
        this.log("Running status requested");

        this.getStatus((error, status) => {
            if (error) {
                callback(error);
            } else {
                callback(null, status.running);
            }
        });
    },

    getIsCharging(callback) {
        this.log("Charging status requested");

        this.getStatus((error, status) => {
            if (error) {
                callback(error);
            } else {
                callback(null, status.charging);
            }
        });
    },

    getBatteryLevel(callback) {
        this.log("Battery level requested");

        this.getStatus((error, status) => {
            if (error) {
                callback(error);
            } else {
                callback(null, status.batteryLevel);
            }
        });
    },

    getLowBatteryStatus(callback) {
        this.log("Battery status requested");

        this.getStatus((error, status) => {
            if (error) {
                callback(error);
            } else {
                callback(null, status.batteryStatus);
            }
        });
    },

    identify(callback) {
        this.log("Identify requested. Not supported yet.");

        callback();
    },

    getStatus(callback, silent) {
        let status = this.cache.get(STATUS);

        if (status) {
            if (status === "fetching") {
                let that = this;

                setTimeout(() => that.getStatus(callback), 1000);
            } else {
                callback(null, status);
            }
        } else {
            this.getStatusFromRoomba(callback, silent);
        }
    },

    getStatusFromRoomba(callback, silent) {
        let that = this;
        let roomba = new dorita980.Local(this.blid, this.robotpwd, this.ipaddress);

        let status = {
            running: 0,
            charging: 0,
            batteryLevel: "N/A",
            batteryStatus: "N/A",
            binFull: false
        };

        that.cache.set(STATUS, "fetching");

        roomba.on("connect", () => {

            if (!silent) that.log("Connected to Roomba");

            timeout(roomba.getRobotState(["cleanMissionStatus", "batPct", "bin"]), 3000).then((response => {
                roomba.end();

                status.batteryLevel = response.batPct;
                status.binFull = response.bin.full;

                if (status.batteryLevel <= 20) {
                    status.batteryStatus = Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
                } else {
                    status.batteryStatus = Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
                }

                switch (response.cleanMissionStatus.phase) {
                    case "run":
                        status.running = 1;
                        status.charging = Characteristic.ChargingState.NOT_CHARGING;

                        break;
                    case "charge":
                        status.running = 0;
                        status.charging = Characteristic.ChargingState.CHARGING;

                        break;
                    default:
                        status.running = 0;
                        status.charging = Characteristic.ChargingState.NOT_CHARGING;

                        break;
                }

                callback(null, status);

                that.cache.set(STATUS, status);

                if (!silent) that.log("Roomba[%s]", JSON.stringify(status));
            })).catch(error => {
                roomba.end();

                if (!silent) that.log("Unable to determine state of Roomba");

                that.log.debug(error);

                callback(error);

                that.cache.del(STATUS);
            });
        });
    },

    getServices() {
        this.accessoryInfo.setCharacteristic(Characteristic.Manufacturer, "iRobot");
        this.accessoryInfo.setCharacteristic(Characteristic.SerialNumber, "See iRobot App");
        this.accessoryInfo.setCharacteristic(Characteristic.Identify, false);
        this.accessoryInfo.setCharacteristic(Characteristic.Name, this.name);
        this.accessoryInfo.setCharacteristic(Characteristic.Model, this.model);
        this.accessoryInfo.setCharacteristic(Characteristic.FirmwareRevision, this.firmware);

        this.switchService
            .getCharacteristic(Characteristic.On)
            .on("set", this.setState.bind(this))
            .on("get", this.getRunningStatus.bind(this));

        this.batteryService.getCharacteristic(Characteristic.BatteryLevel)
            .on("get", this.getBatteryLevel.bind(this));
        this.batteryService.getCharacteristic(Characteristic.ChargingState)
            .on("get", this.getIsCharging.bind(this));
        this.batteryService.getCharacteristic(Characteristic.StatusLowBattery)
            .on("get", this.getLowBatteryStatus.bind(this));


        return [this.accessoryInfo, this.switchService, this.batteryService];
    },

    autoRefresh() {
        if (this.autoRefreshEnabled) {
            clearTimeout(this.timer);

            this.timer = setTimeout(function () {
                this.getStatus(function (error, status) {
                    if (!error) {
                        this.switchService.getCharacteristic(Characteristic.On).updateValue(status.running);
                        this.batteryService.getCharacteristic(Characteristic.ChargingState).updateValue(status.charging);
                        this.batteryService.getCharacteristic(Characteristic.BatteryLevel).updateValue(status.batteryLevel);
                        this.batteryService.getCharacteristic(Characteristic.StatusLowBattery).updateValue(status.batteryStatus);
                    }
                }.bind(this), true);

                this.autoRefresh();
            }.bind(this), this.pollingInterval * 1000);
        }
    }
};

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-roomba", "Roomba", roombaAccessory);
};
