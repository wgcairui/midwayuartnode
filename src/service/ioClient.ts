import * as Client from "socket.io-client"
import { Provide, Init, App } from "@midwayjs/decorator"
import { Application } from "@cairui/midway-tcpserver"

@Provide()
export class ioClientService {

    @App()
    app: Application


    io: Client.Socket

    @Init()
    async init() {
        this.io = Client.io('http://uart.ladishb.com:9010/node', { path: "/client" })
    }
}