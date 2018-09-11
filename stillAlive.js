const request = require('request');
const constant = require('./constant');
const utils = require('./service/utils');
const shell = require('shelljs');

// send the status in parameter to the sever
const sendStatus = function (status, koAvailable) {
    request({
        url: constant.SERVER_DOMAIN + '/api/printer/' + utils.getDeviceId() + '/status',
        method: 'PUT',
        json: {
            status: status,
            koAvailable,
        }
    }, function (err, e, b) {
        if (err) {
            // internet connection error ?
            utils.logger.error('Send status to   : ' + JSON.stringify(err));
        }
        if (b.action === "reboot") {
            shell.exec("reboot", function () {
                process.exit();
            });
        }
    })
};

// refresh the printer status
const refreshPrinterStatus = function () {
    shell.exec('df /',
        (error, stdout) => {
            const myRegexp = /([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+) \//g;
            const match = myRegexp.exec(stdout);
            const koAvailable = match[4];
            shell.exec(constant.BASH_TEST_PRINTER_SCRIPT_PATH,
                (error, stdout) => {
                    const status = stdout.replace('\n', '');
                    utils.logger.info('Printer status : ' + status + ', koAvailable:' + koAvailable);
                    sendStatus(status, koAvailable);
                });
        });
};

// init
const init = function () {

    refreshPrinterStatus();

    // refresh printer status every 10 minutes
    setInterval(function () {
        refreshPrinterStatus();
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

