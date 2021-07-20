import { Provide, Inject } from "@midwayjs/decorator"
import { TCPControll, OnConnection, Context, OnDisConnection, OnTCPMessage } from "@cairui/midway-tcpserver"
import { Cache } from "../service/cache"
import { TcpServerService } from "../service/tcpServer"
import { ioClientService } from "../service/ioClient"
import { Fetch } from "../service/fetch"

@Provide()
@TCPControll()
export class TcpControll {

    @Inject()
    Cache: Cache

    @Inject()
    ctx: Context

    @Inject()
    TcpServerService: TcpServerService

    @Inject()
    ioClientService: ioClientService 

    @Inject()
    Fetch: Fetch


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
                if (this.Cache.registerConfig?.UserID) {
                    socket.write(Buffer.from(`+++AT+IOTUID=${this.Cache.registerConfig.UserID}\r`, "utf-8"))
                } 
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

                    socket.Property = {
                        mac,
                        port: socket.remotePort,
                        ip: socket.remoteAddress,
                        lock: false
                    }

                    socket
                        .setKeepAlive(true, 1e5)
                        .setNoDelay(true)
                        .on("error", (err) => {
                            console.error({ mac, type: 'socket connect error', time: new Date(), code: err.name, message: err.message, stack: err.stack });
                            // this.socket.destroy(err)
                            this.TcpServerService.dtuOffline(socket)
                        })
                        .on("timeout", () => {
                            console.log(`### timeout==${socket.Property.ip}:${socket.Property.port}::${socket.Property.mac}`);
                            this.TcpServerService.dtuOffline(socket)
                        })


                    this.Cache.socket.set(mac, socket)

                    const dtuInfo = await this.TcpServerService.getDtuInfo(socket)
                    this.Fetch.dtuInfo(dtuInfo)

                    this.ioClientService.terminalOn(mac, false)
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
        //console.log({ data ,id:this.ioClientService.ioClient});

    }

    @OnTCPMessage("error")
    async error(err: Error) {
        console.error(`socket error:${err.message}`, err);
        this.ctx.destroy()
        this.TcpServerService.dtuOffline(this.ctx)
    }

    @OnTCPMessage("timeout")
    async timeout() {
        console.log(`### timeout==${this.ctx.remoteAddress}:${this.ctx.remotePort}::`);
        this.TcpServerService.dtuOffline(this.ctx)
    }
}
