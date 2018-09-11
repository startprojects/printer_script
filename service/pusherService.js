// dependencies
const Pusher = require('pusher-js');
const fs = require('fs');

const constant = require('../constant');
const utils = require('./utils');


// return the pusher public key
const getPusherInfo = function () {
    const bodyJson = fs.readFileSync(constant.PUSHER_INFO_PATH);
    return JSON.parse(bodyJson);
};

// load pusher info
const pusherInfo = getPusherInfo();

// establish connection
// TODO !!! wait internet connection
const pusherSocket = new Pusher(pusherInfo.publicKey, {
    cluster: pusherInfo.cluster,
    encrypted: true,
    authEndpoint: constant.SERVER_DOMAIN + '/pusher/auth'
});

// subscribe to pusher channel
// TODO wait device read
exports.personalChannel = pusherSocket.subscribe('private-printer-' + utils.getDeviceId());
exports.clientChannel = pusherSocket.subscribe('private-printers');

// add event when connection status change
pusherSocket.connection.bind('state_change', function (states) {
    utils.logger.warn('pusher connection status changes from ' + states.previous + ' to ' + states.current);
    // // launch message if connected
    // if (states.current === 'connected') {
    //     returnToResponseChannel('private-admin', 'start-pong', 'Pong! Client is ready', {
    //         deviceId
    //     });
    // }
});