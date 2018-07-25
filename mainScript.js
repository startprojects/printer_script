// CONSTANTS
const SKIPQ_FOLDER = '/home/pi/skipq/script/';
const PUSHER_PUBLIC_KEY = 'da1aeba7cb6efed85f57';
const PUSHER_CLUSTER = 'eu';
const SERVER_DOMAIN = 'https://business.skip-q.com';
const TICKETS_FOLDER_NAME = 'ticketToPrint';

const fs = require('fs');
const path = require('path');
// const winston = require('winston');
const request = require('request');
const shell = require('shelljs');
const Pusher = require('pusher-client');
const dateFormat = require('dateformat');
const dns = require('dns');

// test internet connection
const testInternetConnection = function (callback) {
    dns.lookup('google.com', function (err) {
        callback(!err);
    });
};

// init logger
const logger = {
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

// convert string to file
const getFileFromBase64 = function (path, base64, promise) {
    // TODO clean file to avoid too much ticket ?
    fs.writeFile(path, base64, {encoding: 'base64'}, function () {
        promise();
    });
};

// return info to the specified channel
const returnToResponseChannel = function (channelForResponse, type, message) {
    const responseChannel = pusher.subscribe(channelForResponse);
    // wait 1 second to subscription
    // TODO optimize ?
    setTimeout(() => {
        responseChannel.trigger('client-main', {
            device: deviceId,
            type: type,
            message: message,
        });
    }, 1000);
};

// get the result of the prinr
const getPrintResult = function (printReference, callback) {
    shell.exec(SKIPQ_FOLDER + 'bash_service/test-print.sh "' + printReference + '"',
        (error, stdout, stderr) => {
            const status = stdout.replace('\n', '');
            logger.info('Status for ' + printReference + ' : ' + status);
            callback(status);
        })
};

// send print result
const sendPrintResult = function (printTaskId, result) {
    request({
        url: SERVER_DOMAIN + '/api/printTask/' + printTaskId + '/status',
        method: 'PUT',
        json: {
            status: result,
        }
    }, function (err, e, b) {
        if (err) {
            logger.error('Send status to   : ' + JSON.stringify(err));
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
            logger.info('Print reference : ' + printReference);
            callback(printReference);
        });
};

// PUSHER : pong
const sendPong = function (channelForResponse) {
    returnToResponseChannel(channelForResponse, 'pong', 'Pong! Device ' + deviceId + ' is online !!! 3');
};

// PUSHER : log
const sendLog = function (channelForResponse) {
    fs.readFile(SKIPQ_FOLDER + 'logs/' + currentTime + '.log', {encoding: 'utf-8'}, function (err, data) {
        returnToResponseChannel(channelForResponse, 'log', data);
    });
};


// PUSHER : print
const printOrder = function (name, printTaskId, base64Ticket) {
    const time = dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss');
    const fileName = SKIPQ_FOLDER + TICKETS_FOLDER_NAME + '/' + name + ' - ' + time + '.pdf';
    logger.info('Try to print order  ' + fileName);
    getFileFromBase64(fileName, base64Ticket, () => {
        print(fileName, (printReference) => {
            if (printTaskId) {
                logger.info('Test print result for  ' + printReference + ' / ' + printTaskId);
                let attempt = 0;
                const testInterval = setInterval(function () {
                    getPrintResult(printReference, (result) => {
                        if (result === 'DONE') {
                            sendPrintResult(printTaskId, result);
                            clearInterval(testInterval);
                        }
                        else {
                            attempt++;
                            if (attempt > 12) {
                                sendPrintResult(printTaskId, 'FAILED AFTER 2 MINUTES');
                                clearInterval(testInterval);
                            }
                        }
                    });
                }, 10000);
            }
        });
    });
};

// PUSH : list order tickets
const listOrderTickets = function (channelForResponse) {
    shell.exec('ls -1 ' + SKIPQ_FOLDER + TICKETS_FOLDER_NAME,
        (error, stdout, stderr) => {
            returnToResponseChannel(channelForResponse, 'list ticket', stdout.replace(new RegExp('\n', 'g'), '<br/>'));
        });
};


// PUSHER : listeners
const pusherListener = function (channel) {
    channel.bind('main', function (data) {
        logger.info('Main event received : ' + data.type);
        switch (data.type) {
            case 'ping':
                sendPong(data.channelForResponse);
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
            case 'send_log':
                sendLog(data.channelForResponse);
                break;
            case 'reboot':
                shell.exec("reboot", function (error, stdout, stderr) {
                    process.exit();
                });
                break;
            default:
        }
    });
};

// return the device id
const getDeviceId = function () {
    const bodyJson = fs.readFileSync(path.resolve(__dirname, 'device.json'));
    body = JSON.parse(bodyJson);
    return body.id;
};

// send the status in parameter to the sever
const sendStatus = function (deviceId, status) {
    request({
        url: 'https://business.skip-q.com/api/printer/' + deviceId + '/status',
        method: 'PUT',
        json: {
            status: status,
        }
    }, function (err, e, b) {
        if (err) {
            // internet connection error ?
            logger.error('Send status to   : ' + JSON.stringify(err));
        }
    })
};

// refresh the printer status
const refreshPrinterStatus = function (deviceId) {
    shell.exec(SKIPQ_FOLDER + 'bash_service/test-printer.sh',
        (error, stdout, stderr) => {
            const status = stdout.replace('\n', '');
            logger.info('Printer status : ' + status);
            sendStatus(deviceId, status);
        });
};

// variable
let personalChannel;
let clientChannel;
let pusher;
// load and store the device Id
const deviceId = getDeviceId();

// init
const init = function () {

    logger.info('Init for ' + deviceId);

    // PUSHER : authentication
    pusher = new Pusher(PUSHER_PUBLIC_KEY, {
        cluster: PUSHER_CLUSTER,
        encrypted: true,
        authEndpoint: SERVER_DOMAIN + '/pusher/auth'
    });

    // subscribe to pusher channel
    personalChannel = pusher.subscribe('private-printer-' + deviceId);
    clientChannel = pusher.subscribe('private-printers');

    // add listener to channels
    pusherListener(personalChannel, clientChannel);

    // refresh printer status every 1 minutes
    refreshPrinterStatus(deviceId);
    setInterval(function () {
        refreshPrinterStatus(deviceId);
    }, 10 * 60 * 1000);
};

// starter
const starterInterval = setInterval(function () {
    testInternetConnection((isInternetAvailable) => {
        if (isInternetAvailable) {
            init();
            clearInterval(starterInterval);
        }
        else {
            logger.info("not internet connection. Retry in 10 seconds.....");
        }
    });
}, 10 * 1000);




