const request = require('request');
const constant = require('./constant');
const utils = require('./service/utils');
const shell = require('shelljs');

// send the status in parameter to the sever
const sendStatus = function (deviceId, status, koAvailable) {
    request({
        url: constant.SERVER_DOMAIN + '/api/printer/' + deviceId + '/status',
        method: 'PUT',
        json: {
            status: status,
            koAvailable,
        }
    }, function (err, e, b) {
        if (err) {
            // internet connection error ?
            constant.logger.error('Send status to   : ' + JSON.stringify(err));
        }
    })
};

// refresh the printer status
const refreshPrinterStatus = function (deviceId) {
    shell.exec('df /',
        (error, stdout) => {
            const myRegexp = /([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+) \//g;
            const match = myRegexp.exec(stdout);
            const koAvailable = match[4];
            shell.exec(constant.SCRIPT_FOLDER + 'bash_service/test-printer.sh',
                (error, stdout, stderr) => {
                    const status = stdout.replace('\n', '');
                    constant.logger.info('Printer status : ' + status + ', koAvailable:' + koAvailable);
                    sendStatus(deviceId, status, koAvailable);
                });
        });
};

// init
const init = function () {

    refreshPrinterStatus();

    // refresh printer status every 10 minutes
    setInterval(function () {
        refreshPrinterStatus(utils.getDeviceId());
    }, 10 * 60 * 1000);
};

// start, test every 10 seconds if the device id exists, launch the script
if (utils.getDeviceId())
    init();
else {
    const testInterval = setInterval(function () {
        if (utils.getDeviceId()) {
            init();
            clearInterval(testInterval);
        }
    }, 10 * 1000);
}

