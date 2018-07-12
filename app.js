// 1. Install node and software

// sudo apt-get update
// sudo apt-get remove nodered -y
// sudo apt-get remove nodejs nodejs-legacy -y
// sudo apt-get remove npm -y
// sudo curl -sL https://deb.nodesource.com/setup_6.x | sudo bash -
// sudo apt-get install -y nodejs

// 2. Install printer system and drivers

// sudo apt-get install cups
// sudo adduser pi lpadmin
// install go 1.4.3
// build from source gcp as explained on the relevant github

// wget http://download.dymo.com/Download%20Drivers/Linux/Download/dymo-cups-drivers-1.4.0.tar.gz
// tar xvf dymo-cups-drivers-1.4.0.tar.gz
// cd dymo-cups-drivers-1.4.0.5/
// sudo ./configure
// sudo make
// sudo make install
// sudo useradd -s /usr/sbin/nologin -r -M cloud-print-connector
// sudo mkdir /opt/cloud-print-connector
// sudo apt-get install libcups2 libcupsimage2-dev libavahi-client3 avahi-daemon libsnmp30 google-cloud-print-connector

// Setup cups for correct paper size, and default behavior to abort-job and not stop

// 3. start up scripts

// /etc/rc.local
// sleep 60
// sudo chmod 660 /opt/cloud-print-connector/gcp-cups-connector.config.json &
// sudo chown cloud-print-connector:cloud-print-connector /opt/cloud-print-connect$
// sudo ./opt/cloud-print-connector/gcp-cups-connector --config-filename /opt/clou$
// sleep 10
// sudo node /home/pi/skipq/app.js < /dev/null &

// npm install pusher-client
// npm install request
// npm install node-printer
console.log('Init PI script');

var fs = require('fs');
var path = require('path');
var request = require('request');
var exec = require('child_process').exec;

//subscribe to events

var sub = function(deviceId) {
	console.log('------ SUB');

	//check device setup 
	if (!fs.existsSync('/opt/cloud-print-connector/gcp-cups-connector.config.json')) {
		console.log('the file gcp-cup..config doesnt exists');
       		if (fs.existsSync('/home/pi/gcp-cups-connector.config.json'))		
			exec("sudo mv /home/pi/gcp-cups-connector.config.json /opt/cloud-print-connector/gcp-cups-connector.config.json", function(error, stdout, stderr) {});
		return;
	} else {
		console.log('send setting to skipq');
		var settings = fs.readFileSync('/opt/cloud-print-connector/gcp-cups-connector.config.json');
		console.log('setting : ');
		console.log(settings);
		settings = JSON.parse(settings);
		console.log(body)
		request({
			url: 'https://business.skip-q.com/api/printers/' + deviceId,
			method: 'PUT',
			json: settings
		}, function(err, e, b) {
			console.log('setting request result : ');
		})
	}

	console.log('register pusher to pusher-client')
	var Pusher = require('pusher-client');
	var pusher = new Pusher('da1aeba7cb6efed85f57', {
		cluster: 'eu',
		encrypted: true,
		authEndpoint: 'https://business.skip-q.com/pusher/auth'
	});
	
	console.log('registrer pusher to private-printer-'+deviceId);
	var channel = pusher.subscribe('private-printer-' + deviceId);
	var clientChannel = pusher.subscribe('private-printers');


	channel.bind('main', function(data) {
		console.log('a new events arrives : ');
		console.log(data);
		console.log(data.type);
		switch (data.type) {
			case 'reboot':
				clientChannel.trigger('client-main', {
					device: deviceId,
					type: 'reboot'
				});
				exec("reboot", function(error, stdout, stderr) {
					process.exit();
				});
				break;
			case 'exec':
				var e = exec(data.line);
				e.stdout.on('data', function(data) {
					clientChannel.trigger('client-main', {
						message: data,
						type: 'exec'
					});
				});
				break;
			case 'update':
				request('https://business.skip-q.com/printerCode/app.js', function(error, response, body) {
					if (!error && response.statusCode === 200) {
						fs.writeFileSync(path.resolve(__dirname, 'app.js'), body);
						clientChannel.trigger('client-main', {
							device: deviceId,
							type: 'update'
						});
						exec("reboot", function(error, stdout, stderr) {
							process.exit();
						});
					}
				});
				break;
			case 'printers':
				var Printer = require('node-printer');
				clientChannel.trigger('client-main', {
					printers: Printer.list(),
					message: 'Found printers: ' + Printer.list().join(', '),
					device: deviceId,
					type: 'printers'
				});
				break;
			case 'ping':
				clientChannel.trigger('client-main', {
					device: deviceId,
					type: 'ping',
					message: 'Pong! Device is online!'
				});
				break;
			default:
		}
	});
}

// register device

if (!fs.existsSync(path.resolve(__dirname, 'device.json'))) {
	console.log('register device')
	request('https://business.skip-q.com/api/registerPrinter', function(error, response, body) {
		if (!error && response.statusCode === 200) {
			fs.writeFileSync(path.resolve(__dirname, 'device.json'), body);
			body = JSON.parse(body);
			sub(body.id);
			fs.writeFileSync('/home/pi/Desktop/PI-' + body.id + '.txt', JSON.stringify(body));
		} else {
			console.log("Got an error: ", error, ", status code: ", response.statusCode)
			process.exit();
		}
	})
} else {
	var body = fs.readFileSync(path.resolve(__dirname, 'device.json'));
	body = JSON.parse(body);
	sub(body.id);
}

// reboot if no internet every 5 mins

setInterval(function() {
	console.log('internet check')
	require('dns').lookup('google.com', function(err) {
		if (err && err.code == "ENOTFOUND") {
			exec("reboot", function(error, stdout, stderr) {
				process.exit();
			});
		} else {
			console.log('internet ok')
		}
	});
}, 5 * 60 * 1000);
