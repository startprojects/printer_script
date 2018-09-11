// dependencies
const constant = require('./constant');
const utils = require('./service/utils');
const fs = require('fs');
const rimraf = require('rimraf');
const request = require('request');
const shell = require('shelljs');
const Pusher = require('pusher-js');
const dateFormat = require('dateformat');
const dns = require('dns');
const _ = require('underscore');
const copyFileSync = require('fs-copy-file-sync');

// variable
let personalChannel;
let clientChannel;
let pusherSocket;
let deviceId;

// test internet connection
const testInternetConnection = function (callback) {
    dns.lookup('google.com', function (err) {
        callback(!err);
    });
};

// convert string to file
const getFileFromBase64 = function (path, base64, promise) {
    // TODO clean file to avoid too much ticket ?
    fs.writeFile(path, base64, {encoding: 'base64'}, function () {
        promise();
    });
};

// return info to the specified channel
const returnToResponseChannel = function (channelForResponse, type, message, params) {
    utils.logger.info('send message ' + type + ' to channel ' + channelForResponse);
    const responseChannel = pusherSocket.subscribe(channelForResponse);
    // wait 1 second to subscription
    // TODO optimize ?
    if (!params)
        params = {};
    params.device = deviceId;
    params.type = type;
    params.message = message;
    setTimeout(() => {
        responseChannel.trigger('client-main', params);
    }, 1000);
};

// get the result of the prinr
const getPrintResult = function (printReference, callback) {
    shell.exec(constant.SCRIPT_FOLDER + 'bash_service/test-print.sh "' + printReference + '"',
        (error, stdout, stderr) => {
            const status = stdout.replace('\n', '');
            utils.logger.info('Status for ' + printReference + ' : ' + status);
            callback(status);
        })
};

// send print result
const sendPrintResult = function (printTaskId, result) {
    utils.logger.info("sendPrintResult " + printTaskId + " / " + result);
    request({
        url: constant.SERVER_DOMAIN + '/api/printTask/' + printTaskId + '/status',
        method: 'PUT',
        json: {
            status: result,
        }
    }, function (err, e, b) {
        if (err) {
            utils.logger.error('Send status to   : ' + JSON.stringify(err));
        }
    })
};

// print file get in param and return the request id
const print = function (fileName, callback) {
    shell.exec('lp "' + fileName + '"',
        (error, stdout, stderr) => {
            const orderReferenceReg = /request id is ([^ ]*)/;
            const match = orderReferenceReg.exec(stdout);
            const printReference = match[1];
            utils.logger.info('Print reference : ' + printReference);
            callback(printReference);
        });
};

// PUSHER : pong
const sendPong = function (type, channelForResponse) {
    utils.logger.info('send pong to channel ' + channelForResponse);
    returnToResponseChannel(channelForResponse, type, 'Device ' + deviceId + ' is online with ' + utils.getVersion(), {
        deviceId
    });
};

// PUSHER : log
const sendLog = function (channelForResponse, logName, logType) {
    utils.logger.info('send log ' + logName + ' to ' + channelForResponse);
    const filePath = (logType === 'initLog' ? constant.INIT_LOGS_FOLDER_PATH : constant.LOGS_FOLDER_PATH) + '/' + logName;
    const bitmap = fs.readFileSync(filePath);
    const fileInBase64 = new Buffer(bitmap).toString('base64');
    request({
        url: constant.SERVER_DOMAIN + '/api/printer/' + utils.getDeviceId() + '/log',
        method: 'PUT',
        json: {
            content: fileInBase64,
            name: logName,
        }
    }, function (err, e, b) {
        if (err) {
            utils.logger.error('Send status to   : ' + JSON.stringify(err));
        }
        const target = 'printerLogs/' + deviceId + '/' + logName;
        returnToResponseChannel(channelForResponse, 'log', {target});
    });
};

// PUSHER : list of logs
const sendLogs = function (channelForResponse) {
    shell.exec('ls -1 ' + constant.LOGS_FOLDER_PATH,
        (error, stdout) => {
            const arr = _.filter(stdout.split("\n"), (name) => {
                return name && name.length > 2;
            });
            shell.exec('ls -1 ' + constant.INIT_LOGS_FOLDER_PATH,
                (error2, stdout2) => {
                    const arr2 = _.filter(stdout2.split("\n"), (name) => {
                        return name && name.length > 2;
                    });
                    returnToResponseChannel(channelForResponse, 'list logs', 'list', {
                        logs: arr,
                        initLogs: arr2,
                    });
                });
        });
};


// PUSHER : print
const printOrder = function (name, printTaskId, base64Ticket) {
    sendPrintResult(printTaskId, 'ORDER RECEIVED');
    const time = dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss');
    const fileName = constant.TICKETS_FOLDER_PATH + '/' + name + ' - ' + time + '.pdf';
    utils.logger.info('Try to print order  ' + fileName);
    getFileFromBase64(fileName, base64Ticket, () => {
        print(fileName, (printReference) => {
            if (printTaskId) {
                utils.logger.info('Test print result for  ' + printReference + ' / ' + printTaskId);
                let attempt = 0;
                const testInterval = setInterval(function () {
                    getPrintResult(printReference, (result) => {
                        if (result === 'DONE') {
                            sendPrintResult(printTaskId, 'DONE');
                            clearInterval(testInterval);
                        }
                        else {
                            attempt++;
                            if (attempt > 4) {
                                // after 2 minutes, change the status but continue the loop
                                sendPrintResult(printTaskId, 'FAILED : PRINTER OFF');
                            }
                            // after 6 hours, stop loop
                            if (attempt >= 6 * 60 * 2) {
                                clearInterval(testInterval);
                            }
                        }
                    });
                }, 30 * 1000);
            }
        });
    });
};

// PUSH : list order tickets
const listOrderTickets = function (channelForResponse) {
    shell.exec('ls -1 ' + constant.TICKETS_FOLDER_PATH,
        (error, stdout) => {
            const arr = _.filter(stdout.split("\n"), (name) => {
                return name && name.length > 2;
            });
            returnToResponseChannel(channelForResponse, 'list_tickets', 'list', {
                tickets: arr,
            });
        });
};

// PUSHER : send ticket in base64
const sendTicket = function (channelForResponse, ticketName) {
    const bitmap = fs.readFileSync(constant.TICKETS_FOLDER_PATH + '/' + ticketName);
    const fileInBase64 = new Buffer(bitmap).toString('base64');
    returnToResponseChannel(channelForResponse, 'send_ticket', 'list', {
        file: fileInBase64,
        fileName: ticketName,
    });
};

// clean logs and tickets
const removeFileOldThanOneDay = function (folderPath) {
    fs.readdir(folderPath, function (err, files) {
        files.forEach(function (file) {
            const filePath = folderPath + '/' + file;
            fs.stat(filePath, function (err, stat) {
                let endTime, now;
                if (err) {
                    return console.error(err);
                }
                now = new Date().getTime();
                endTime = new Date(stat.ctime).getTime() + 24 * 60 * 60 * 1000;
                if (now > endTime) {
                    return rimraf(filePath, function (err) {
                        if (err) {
                            return console.error(err);
                        }
                        console.log('successfully deleted');
                    });
                }
            });
        });
    });
};
const cleanComputer = function () {
    removeFileOldThanOneDay(constant.TICKETS_FOLDER_PATH);
    removeFileOldThanOneDay(constant.LOGS_FOLDER_PATH);
};


// PUSHER : listeners
const pusherListener = function (channel) {
    channel.bind('main', function (data) {
        utils.logger.info('Main event received : ' + data.type);
        switch (data.type) {
            case 'ping':
                sendPong('pong', data.channelForResponse);
                break;
            case 'pingAll':
                sendPong('pongAll', data.channelForResponse);
                break;
            case 'print_order':
                const printTaskId = data.printTaskId;
                const name = data.name;
                const file = data.file;
                printOrder(name, printTaskId, file);
                break;
            case 'list_order_tickets':
                listOrderTickets(data.channelForResponse);
                break;
            case 'send_ticket':
                sendTicket(data.channelForResponse, data.ticketName);
                break;
            case 'send_logs':
                sendLogs(data.channelForResponse);
                break;
            case 'send_log':
                sendLog(data.channelForResponse, data.logName, data.logType);
                break;
            case 'reboot':
                shell.exec("reboot", function (error, stdout, stderr) {
                    process.exit();
                });
                break;
            case 'clean_useless_file':
                cleanComputer();
                break;
            default:
        }
    });
};

// return the pusher public key
const getPusherInfo = function () {
    const bodyJson = fs.readFileSync(constant.PUSHER_INFO_PATH);
    const body = JSON.parse(bodyJson);
    return body;
};

// init
const init = function () {

    utils.logger.info('Init for ' + deviceId);

    // PUSHER : authentication
    // load public key

    pusherSocket = new Pusher(getPusherInfo().publicKey, {
        cluster: getPusherInfo().cluster,
        encrypted: true,
        authEndpoint: constant.SERVER_DOMAIN + '/pusher/auth'
    });

    // subscribe to pusher channel
    personalChannel = pusherSocket.subscribe('private-printer-' + deviceId);
    clientChannel = pusherSocket.subscribe('private-printers');

    // add event when connection status change
    pusherSocket.connection.bind('state_change', function (states) {
        utils.logger.warn('pusher connection status changes from ' + states.previous + ' to ' + states.current);
        // launch message if connected
        if (states.current === 'connected') {
            returnToResponseChannel('private-admin', 'start-pong', 'Pong! Client is ready', {
                deviceId
            });
        }
    });

    // add listeners to channels
    pusherListener(personalChannel);
    pusherListener(clientChannel);
};

// starter
const start = function () {
    testInternetConnection((isInternetAvailable) => {
        if (isInternetAvailable) {
            init();
        }
        else {
            // no internet connexion ? wait...
            const starterInterval = setInterval(function () {
                testInternetConnection((isInternetAvailable) => {
                    if (isInternetAvailable) {
                        init();
                        clearInterval(starterInterval);
                    }
                    else {
                        utils.logger.info("not internet connection. Retry in 10 seconds.....");
                    }
                });
            }, 10 * 1000);
        }
    });
};

// if there is a new init file, replace and reload
if (!fs.existsSync('/etc/rc.local') || fs.readFileSync(constant.SCRIPT_FOLDER + 'init/init.sh') !== fs.readFileSync('/etc/rc.local')) {
    copyFileSync(constant.SCRIPT_FOLDER + 'init/init.sh', '/etc/rc.local');
    // shell.exec("reboot", function () {
    //     process.exit();
    // });
}
else if (!fs.existsSync(constant.DEVICE_INFO_PATH)) {
    utils.logger.info('device.json file not found : registre the device');
    request(constant.SERVER_DOMAIN + '/api/registerNewPrinter', function (error, response, body) {
        if (!error && response.statusCode === 200) {
            fs.writeFileSync(constant.DEVICE_INFO_PATH, body);

            deviceId = utils.getDeviceId();
            // just for information
            fs.writeFileSync('/home/pi/Desktop/PI-' + deviceId + '.txt', JSON.stringify(body));
            utils.logger.info('Registered as printer ' + deviceId);
            start();

        } else {
            utils.logger.error("Got an error: ", error, ", status code: ", response.statusCode);
            process.exit();
        }
    })
} else {
    deviceId = utils.getDeviceId();
    utils.logger.info('Printer ' + deviceId);
    start();
}