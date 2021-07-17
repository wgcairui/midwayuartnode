import { Provide, Inject } from "@midwayjs/decorator"
import { TCPControll, OnConnection, Context, OnDisConnection, OnTCPMessage } from "@cairui/midway-tcpserver"
import { Cache } from "../service/cache"
import { TcpServerService } from "../service/tcpServer"

@Provide()
@TCPControll()
export class TcpControll {

    @Inject()
    Cache: Cache

    @Inject()
    ctx: Context

    @Inject()
    TcpServerService: TcpServerService

    @OnConnection()
    async connecting() {
        const socket = this.ctx
        if (!socket || !socket.remoteAddress || !socket.writable) return
        console.log(`${new Date().toLocaleString()}==新的socket连接,连接参数: ${socket.remoteAddress}:${socket.remotePort}`);
        const timeOut = setTimeout(() => {
            console.log(socket.remoteAddress, '无消息,尝试发送注册信息');
            if (socket && !socket.destroyed && socket.writable) {
                socket.write(Buffer.from('+++AT+NREGEN=A,on\r', "utf-8"))
                socket.write(Buffer.from('+++AT+NREGDT=A,register&mac=%MAC&host=%HOST\r', "utf-8"))
                /* if (this.conf.UserID) {
                    socket.write(Buffer.from(`+++AT+IOTUID=${this.conf.UserID}\r`, "utf-8"))
                } */

            }
        }, 10000);

        // 配置socket参数
        socket
            // 监听第一个包是否是注册包'register&mac=98D863CC870D&jw=1111,3333'
            .once("data", async (data: Buffer) => {
                clearTimeout(timeOut)
                const registerArguments = new URLSearchParams(data.toString())
                //判断是否是注册包
                if (registerArguments.has('register') && registerArguments.has('mac')) {
                    const IMEI = registerArguments.get('mac')!
                    // 是注册包之后监听正常的数据
                    // mac地址为后12位
                    const maclen = IMEI.length;
                    const mac = IMEI.slice(maclen - 12, maclen);
                    console.log(`${new Date().toLocaleString()} ## ${mac}  上线,连接参数: ${socket.remoteAddress}:${socket.remotePort},Tcp Server连接数: ${await this.TcpServerService.getConnections()}`);

                    socket
                        .setKeepAlive(true, 1e5)
                        .setNoDelay(true)

                    this.Cache.socket.set(mac, socket)
                    /* const client = this.MacSocketMaps.get(mac)
                    if (client) {
                        client.reConnectSocket(socket)
                    } else {
                        // 使用proxy代理dtu对象
                        this.MacSocketMaps.set(mac, new Proxy(new Client(socket, mac, registerArguments), ProxyClient))
                        console.log(`${new Date().toLocaleString()} ## ${mac}  上线,连接参数: ${socket.remoteAddress}:${socket.remotePort},Tcp Server连接数: ${await this.TcpServerService.getConnections()}`);
                    } */
                } else {
                    socket.end('please register DTU IMEI', () => {
                        console.log(`###${socket.remoteAddress}:${socket.remotePort} 配置错误或非法连接,销毁连接,[${data.toString()}]`);
                        socket.destroy();
                    })
                }
            });
    }

    @OnDisConnection()
    async disconnecting(reason: string) {
        console.log({ reason });

    }

    @OnTCPMessage("data")
    async data(data: Buffer) {
        console.log({ data });

    }

    @OnTCPMessage("error")
    async error(err: Error) {
        console.error(`socket error:${err.message}`, err);
        this.ctx.destroy()
    }

    @OnTCPMessage("timeout")
    async timeout() {
        console.log(`### timeout==${this.ctx.remoteAddress}:${this.ctx.remotePort}::`);
    }
}
