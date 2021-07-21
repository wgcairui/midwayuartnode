var net = require('net');
var client = net.connect({ port: 9000,host:"120.202.61.88" }, function () { //'connect' listener
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