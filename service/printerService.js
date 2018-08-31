const mysql = require('mysql');
const dateFormat = require('dateformat');

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "printer",
});

con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
});


exports.saveTask = function (printTaskId, fileName, status) {
    if (printTaskId) {
        const dateFormated = dateFormat(new Date(), 'dd-mm-yyyy HH:MM:ss');
        con.query("INSERT INTO print_task(printTaskId, fileName, status,createdAt) VALUES(" + printTaskId + ",'" + fileName + "','" + status + "','" + dateFormated + "')", function (err, result) {
            if (err) throw err;
            console.log("Result: " + result);
        });
    }
};

exports.updateStatus = function (printTaskId, status) {
    if (printTaskId) {
        con.query("UPDATE print_task SET status = '" + status + "' WHERE printTaskId=" + printTaskId, function (err, result) {
            if (err) throw err;
            console.log("Result: " + result);
        });
    }
};

exports.updatePrinterTaskId = function (printTaskId, printerTaskId) {
    if (printTaskId) {
        con.query("UPDATE print_task SET printerTaskId = '" + printerTaskId + "' WHERE printTaskId=" + printTaskId, function (err, result) {
            if (err) throw err;
            console.log("Result: " + result);
        });
    }
};

exports.getFailedTaskForToday = function (callback) {
    const start = new Date();
    start.setMinutes(0);
    start.setSeconds(0);
    start.setHours(0);
    const dateFormated = dateFormat(start, 'yyyy-mm-dd HH:MM:ss');

    con.query("SELECT * FROM print_task WHERE status != 'DONE' AND createdAt > '" + dateFormated + "'",
        function (err, result) {
            if (err) throw err;
            callback(result);
        });
};
