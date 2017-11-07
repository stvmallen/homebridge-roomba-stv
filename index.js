let Service;
let Characteristic;

const dorita980 = require('dorita980');

const roombaAccessory = function (log, config) {
    this.log = log;
    this.name = config.name;
    this.model = config.model;
    this.blid = config.blid;
    this.robotpwd = config.robotpwd;
    this.ipaddress = config.ipaddress;

    this.firmware = 'N/A';
    this.running = 0;
    this.charging = 0;
    this.batteryLevel = 'N/A';
    this.binFull = false;
};


roombaAccessory.prototype = {

    setState(powerOn, callback) {
        let that = this;
        let roomba = new dorita980.Local(this.blid, this.robotpwd, this.ipaddress);

        if (powerOn) {
            that.log('Starting Roomba');

            roomba.on('connect', () => {
                roomba.start().then(() => {
                    setTimeout(function () {
                        that.log('Roomba is running');

                        roomba.end();
                    }, 2000);

                    callback();
                }).catch((error) => {
                    that.log('Roomba failed: %s', error.message);
                    that.log(error);

                    roomba.end();

                    callback(error);
                });
            });
        } else {
            that.log('Roomba pause and dock');

            roomba.on('connect', () => {
                roomba.pause().then(() => {
                    that.log('Roomba is pausing');

                    callback();

                    that.log('Roomba paused, returning to Dock');

                    let checkStatus = function (delay) {
                        setTimeout(function () {
                            roomba.getRobotState(['cleanMissionStatus']).then((function (state) {
                                switch (state.cleanMissionStatus.phase) {
                                    case "stop":
                                        that.log("Roomba has stopped, issuing dock request");

                                        roomba.dock().then(((response) => {
                                            roomba.end();

                                            that.log('Roomba docking');
                                        })).catch((error) => {
                                            that.log('Roomba failed: %s', error.message);
                                        });

                                        break;
                                    case "run":
                                        that.log('Roomba is still running. Will check again in 3 seconds');

                                        checkStatus(delay);

                                        break;
                                    default:
                                        roomba.end();

                                        that.log('Roomba is not running');

                                        break;
                                }

                            })).catch(function (error) {
                                that.log(error);

                                roomba.end();
                            });
                        }, delay)
                    };

                    checkStatus(3000);

                }).catch((error) => {
                    that.log('Roomba failed: %s', error.message);

                    roomba.end();

                    callback(error);
                });
            });
        }
    },

    getState(callback) {
        this.log("Checking Roomba state");
        let that = this;
        let roomba = new dorita980.Local(this.blid, this.robotpwd, this.ipaddress);

        roomba.on('connect', function () {
            that.log('Connected to Roomba');

            roomba.getRobotState(['cleanMissionStatus', 'batPct', 'bin']).then((function (response) {
                roomba.end();

                switch (response.cleanMissionStatus.phase) {
                    case "run":
                        that.log("Roomba is running");

                        that.running = 1;
                        that.charging = 0;

                        break;
                    case "charge":
                        that.log("Roomba is charging");

                        that.running = 0;
                        that.charging = 1;

                        break;
                    default:
                        that.log("Roomba is not running");

                        that.running = 0;
                        that.charging = 0;

                        break;
                }

                callback(null, that.running);

                that.batteryLevel = response.batPct;
                that.binFull = response.bin.full;

                that.log('Roomba[charging=%s, running=%s, batteryLevel=%s, binFull=%s]',
                    that.charging, that.running, that.batteryLevel, that.binFull);
            })).catch(function (err) {
                roomba.end();

                that.log("Unable to determine state of Roomba");
                that.log(err);

                callback(err);
            });
        });
    },

    getIsCharging: function (callback) {
        this.log("Charging status requested for Roomba");

        if (this.charging) {
            callback(null, Characteristic.ChargingState.CHARGING);
        } else {
            callback(null, Characteristic.ChargingState.NOT_CHARGING);
        }
    },

    getBatteryLevel: function (callback) {
        this.log("Battery level requested");

        callback(null, this.batteryLevel);
    },

    identify: function (callback) {
        this.log('Identify requested. Not supported yet.');

        callback();
    },

    getServices() {
        let accessoryInfo = new Service.AccessoryInformation();
        accessoryInfo.setCharacteristic(Characteristic.Manufacturer, "iRobot");
        accessoryInfo.setCharacteristic(Characteristic.SerialNumber, "See iRobot App");
        accessoryInfo.setCharacteristic(Characteristic.Identify, false);
        accessoryInfo.setCharacteristic(Characteristic.Name, this.name);
        accessoryInfo.setCharacteristic(Characteristic.Model, this.model);
        accessoryInfo.setCharacteristic(Characteristic.FirmwareRevision, this.firmware);

        let switchService = new Service.Switch(this.name);
        switchService
            .getCharacteristic(Characteristic.On)
            .on('set', this.setState.bind(this))
            .on('get', this.getState.bind(this));

        let batteryService = new Service.BatteryService(this.name);

        batteryService.getCharacteristic(Characteristic.BatteryLevel)
            .on('get', this.getBatteryLevel.bind(this));

        batteryService.getCharacteristic(Characteristic.ChargingState)
            .on('get', this.getIsCharging.bind(this));

        return [accessoryInfo, switchService, batteryService];
    }
};

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory('homebridge-roomba', 'Roomba', roombaAccessory);
};
