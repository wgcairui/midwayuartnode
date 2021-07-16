const Framework = require('@cairui/midway-tcpserver').Framework;
const framework = new Framework().configure({
  port: 9000,
  host: "0.0.0.0"
});

const { Bootstrap } = require('@midwayjs/bootstrap');
Bootstrap.load(framework).run();