import { Provide, App, Inject } from "@midwayjs/decorator"
import { Application, Context } from "@cairui/midway-tcpserver"
import { AddressInfo } from "net"
import { Cache } from "./cache"
import { tool } from "./tool"
import { ioClientService } from "./ioClient"
import { socketResult } from "../interface"

@Provide()
export class TcpServerService {
    @App()
    private app: Application

    @Inject()
    Cache: Cache

    @Inject()
    tool: tool

    @Inject()
    ioClientService: ioClientService

    /**
   *  统计TCP连接数
   */
    getConnections() {
        return new Promise<number>((resolve) => {
            this.app.getConnections((err, nb) => {
                resolve(nb)
            })
        })
    }

    /**
     * 获取tcpServer监听信息
     * @returns 
     */
    getAddress() {
        return this.app.address() as AddressInfo
    }

    /**
     * 关闭TcpServer连接
     */
    async close() {
        this.Cache.socket.forEach(socket => {
            socket.destroy()
        })
        this.app.close()
        return await new Promise<void>(resolve => {
            setTimeout(() => {
                resolve()
            }, 1000);
        })
    }

    async listen(port: number, hostname: string = '0.0.0.0') {
        await this.close()
        this.app.listen(port, hostname)
        console.log(`### tcpServer listening: ${hostname}:${port}`)
    }

    /**
     * 等待dtu
     * @param mac 
     */
    awaitDtu(mac: string) {
        return new Promise<Context>((resolve, reject) => {
            const socket = this.Cache.socket.get(mac)
            // 如果没有socket,弹出错误
            if (!socket) reject()
            // 如果socket没有锁,resolve
            if (!socket.Property.lock) {
                resolve(socket)
            } else {
                // 超过10s弹出错误
                const inter = setTimeout(() => {
                    console.error(`dtu:${mac} lock timeOut`);
                    reject()
                }, 10000);
                // 监听解锁
                socket.once("unlock", () => {
                    console.log('unlock', socket.Property);
                    clearTimeout(inter)
                    resolve(socket)
                })

            }
        })
    }

    /**
     * dtu离线
     * @param socket 
     */
    dtuOffline(socket: Context) {
        socket.destroy()
        this.Cache.socket.delete(socket.Property.mac)
        this.ioClientService.terminalOff(socket.Property.mac)
    }

    /**
     * 给dtu标注锁状态
     * @param mac 
     */
    lock(socket: Context) {
        socket.Property.lock = true
        socket.emit("lock", socket)
    }

    /**
     * 给dtu标注解锁状态
     * @param mac 
     */
    unlock(socket: Context) {
        socket.Property.lock = false
        socket.emit("unlock", socket)
    }

    /**
     * 判断socket是否未上锁
     * @param mac 
     * @returns 
     */
    isfree(mac: string) {
        const socket = this.Cache.socket.get(mac)
        return Boolean(socket && !socket.Property.lock)
    }

    /**
   * 重启socket
   */
    resatrtSocket(socket: Context) {
        this.QueryAT(socket, "Z")
    }

    /**
     * 获取dtu基本信息
     * @param socket 
     * @returns 
     */
    async getDtuInfo(socket: Context) {
        return await this.awaitDtu(socket.Property.mac).then(async () => {
            const { AT, msg } = await this.QueryAT(socket, "PID")
            socket.Property.AT = AT
            if (AT) {
                socket.Property.PID = msg
                socket.Property.ver = (await this.QueryAT(socket, "VER")).msg
                socket.Property.Gver = (await this.QueryAT(socket, "GVER")).msg
                socket.Property.iotStat = (await this.QueryAT(socket, "IOTEN")).msg
                socket.Property.ICCID = (await this.QueryAT(socket, 'ICCID')).msg
                socket.Property.jw = (await this.QueryAT(socket, "LOCATE=1")).msg
                socket.Property.uart = (await this.QueryAT(socket, "UART=1")).msg
            }
            this.unlock(socket)
            return socket.Property
        })
    }

    /**
     *  查询dtu对象属性,查询行为是高优先级的操作，会暂停整个流程的处理,优先完成查询
     * @param content 查询指令
     */
    private async QueryAT(socket: Context, content: string) {
        // 组装操作指令
        const queryString = Buffer.from('+++AT+' + content + "\r", "utf-8")
        const { buffer } = await this.write(socket, queryString, false)
        return this.tool.ATParse(buffer)
    }


    /**
     * 查询操作,查询会锁住端口状态,完成后解锁
     * @param content 组装好的dtu查询指令
     * @param timeOut 超时时间
     * @param unlock 请求完是否解锁
     */
    async write(socket: Context, content: Buffer, unlock: boolean = true) {
        this.lock(socket)
        const data = await new Promise<socketResult>((resolve) => {
            // 记录socket.bytes
            const Bytes = this.getBytes(socket)
            // 记录开始时间
            const startTime = Date.now();
            // 防止超时
            const time = setTimeout(() => {
                socket.emit('data', 'timeOut')
            }, 10000)
            socket.once("data", buffer => {
                clearTimeout(time)
                resolve({ buffer, useTime: Date.now() - startTime, useByte: this.getBytes(socket) - Bytes })
            })
            // 判断socket流是否安全， socket套接字写入Buffer
            if (socket.writable) {
                socket.write(content)
            }
            else {
                socket.emit("data", 'stream error')
                socket.destroy()
            }
        })
        if (unlock) this.unlock(socket)
        return data
    }

    /**
     * 获取socket发送接收的数据量
     */
    getBytes(socket: Context) {
        return socket.bytesRead + socket.bytesWritten;
    }
}