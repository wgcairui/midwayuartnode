const TcpServer = require('@cairui/midway-tcpserver').Framework;
const tcpServer = new TcpServer().configure({
  port: 9000,
  host: "0.0.0.0"
});


const { Bootstrap } = require('@midwayjs/bootstrap');
Bootstrap
  .load(tcpServer)
  .run();