const mysql = require('mysql');

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database:"printer",
});

con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
});


exports.saveTask = function (printTaskId, fileName, status) {
    if (printTaskId) {
        con.query("INSERT INTO print_task(printTaskId, fileName, status) VALUES(" + printTaskId + ",'" + fileName + "','" + status + "')", function (err, result) {
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
