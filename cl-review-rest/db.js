var mysql      = require('mysql');
var connection = mysql.createConnection({
    host     : '127.0.0.1',
    user     : 'root',
    password : 'Conrad!1',
    database    : 'review_system'
});

connection.connect(function(err) {
    if (err) {
    console.error('error connecting: ' + err.stack);
    return;
}});
console.log('connect done');

module.exports = connection;