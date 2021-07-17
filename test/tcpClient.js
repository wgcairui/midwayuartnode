var net = require('net');
var client = net.connect({ port: 9000,host:"192.168.1.61" }, function () { //'connect' listener
    console.log('client connected');
    client.write('world!\r\n');
});

client.on('data', function (data) {
    console.log(data.toString());
    client.end();
});

client.on('end', function () {
    console.log('client disconnected');
});

setTimeout(() => {
    client.destroy()
}, 10000);