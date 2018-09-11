// dependencies
const constant = require('./constant');
const utils = require('./service/utils');
const shell = require('shelljs');

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
            case 'reboot':
                shell.exec("reboot", function (error, stdout, stderr) {
                    process.exit();
                });
                break;
            default:
        }
    });
};

// PUSHER : pong
const sendPong = function (type, channelForResponse) {
    utils.logger.info('send pong to channel ' + channelForResponse);
    const deviceId = utils.getDeviceId();
    if (deviceId) {
        const responseChannel = pusherSocket.subscribe(channelForResponse);
        // wait 1 second to subscription
        // TODO optimize ?
        const params = {};
        params.device = deviceId;
        params.type = type;
        params.message = 'Device ' + deviceId + ' is online with ' + utils.getVersion();
        setTimeout(() => {
            responseChannel.trigger('client-main', params);
        }, 1000);
    }
};