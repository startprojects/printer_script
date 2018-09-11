// dependencies
const dateFormat = require('dateformat');
const constant = require('./constant');
const fs = require('fs');

// return the device id
exports.getDeviceId = function () {
    if (!fs.existsSync(constant.DEVICE_INFO_PATH))
        return undefined;
    const bodyJson = fs.readFileSync(constant.DEVICE_INFO_PATH);
    const body = JSON.parse(bodyJson);
    return body.id;
};

// get version
exports.getVersion = function () {
    const bodyJson = fs.readFileSync(constant.SCRIPT_INFO_PATH);
    const body = JSON.parse(bodyJson);
    return body.version;
};

// init logger
exports.logger = {
    info: function (text) {
        this.print('INFO', text);
    },
    error: function (text) {
        this.print('ERROR', text);
    },
    warn: function (text) {
        this.print('WARN', text);
    },
    print: function (level, text) {
        const currentTime = dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss');
        console.log(`${currentTime} ${level}: ${text}`);
    }
};