import { Provide, Inject, App } from "@midwayjs/decorator"
import { Application } from "@cairui/midway-tcpserver"
import { ioClientService } from "../service/ioClient"
import { IOControll, OnConnection, OnIOEmit, OnIOMessage } from "@cairui/midway-io.client"
import { Cache } from "../service/cache"
import { tool } from "../service/tool"
import { TcpServerService } from "../service/tcpServer"
import { Fetch } from "../service/fetch"
import { DTUoprate, EVENT, instructQuery, queryObjectServer, registerConfig } from "../interface"

@Provide()
@IOControll()
export class IOClientControll {

    @Inject()
    ctx: ioClientService

    @Inject()
    Cache: Cache

    @Inject()
    tool: tool

    @Inject()
    TcpServerService: TcpServerService

    @Inject()
    Fetch: Fetch

    @App()
    app: Application

    /**
     * 连接到uartServer的IO对象
     */
    @OnConnection()
    connect() {
        console.log(`连接socket服务器:${this.ctx.ioConfig.uri},id:${this.ctx.ioClient.io.id}`);
        console.log(`${new Date().toLocaleString()}:已连接到UartServer:${this.ctx.ioConfig.uri},socketID:${this.ctx.ioClient.io.id},`);
    }

    /**
     * 响应服务端要求注册
     * @returns 
     */
    @OnIOMessage("accont")
    @OnIOEmit(EVENT.register)
    async accont() {
        return this.tool.NodeInfo()
    }

    /**
     * 接受服务端注册信息
     * @param data 
     */
    @OnIOMessage(EVENT.registerSuccess)
    @OnIOEmit(EVENT.ready)
    @OnIOEmit(EVENT.terminalOn)
    async register(data: registerConfig) {
        console.log({ data });

        const ips = this.TcpServerService.getAddress()

        if (ips.port !== data.Port) {
            await this.TcpServerService.close()
            this.TcpServerService.listen(data.Port)
        }
        // 设置tcpServer最大连接数
        this.app.setMaxListeners(data.MaxConnections)
        // 保存配置
        this.Cache.registerConfig = data
        // 上传mac
        const keys = [...this.Cache.socket.keys()]
        // 等待10秒,等待终端连接节点,然后告诉服务器节点已准备就绪
        await new Promise<void>(resolve => {
            setTimeout(() => {
                resolve()
            }, 10000)
        })

        console.log(keys);


        return keys
    }

    /**
     * 接受查询指令
     * @param Query 
     */
    @OnIOMessage(EVENT.query)
    query(Query: queryObjectServer) {
        // console.log(Query);
        
        if (this.Cache.socket.has(Query.DevMac)) {
            Query.DevMac = Query.mac
        }
    }

    /**
     * 终端设备操作指令
     */
    @OnIOMessage(EVENT.instructQuery)
    instructQuery(Query: instructQuery) {
        if (this.Cache.socket.has(Query.DevMac)) {

        }
    }

    /**
     * 发送终端设备AT指令
     * @param Query 
     */
    @OnIOMessage(EVENT.DTUoprate)
    DTUoprate(Query: DTUoprate) {
        if (this.Cache.socket.has(Query.DevMac)) {

        }
    }


    /**
     * 服务器要求发送查询节点运行状态
     */
    @OnIOMessage("nodeInfo")
    async nodeInfo(name: string) {
        const node = this.tool.NodeInfo()
        const tcp = await this.TcpServerService.getConnections()
        this.Fetch.nodeInfo(name, node, tcp)
    }

    /**
     * 断开连接时触发
     * @param reason 
     */
    @OnIOMessage("disconnect")
    disconnect(reason: string) {
        console.log(`${reason},socket连接已丢失，取消发送运行数据`)
    }

    /**
     * 发生错误时触发
     * @param error 
     */
    @OnIOMessage("error")
    error(error: Error) { console.log("error:", error.message) }

    /**
     * 无法在内部重新连接时触发
     */
    @OnIOMessage("reconnect_failed")
    reconnect_failed() {
        console.log('reconnect_failed')
    }

    /**
     * 重新连接尝试错误时触发
     * @param error 
     */
    @OnIOMessage("reconnect_error")
    reconnect_error(error: Error) {
        console.log("reconnect_error:", error.message)
    }

    /**
     * 尝试重新连接时触发
     * @param attemptNumber 
     */
    @OnIOMessage("reconnecting")
    reconnecting(attemptNumber: number) { console.log({ 'reconnecting': attemptNumber }) }

    /**
     * 重新连接成功后触发
     * @param attemptNumber 
     */
    @OnIOMessage("reconnect")
    reconnect(attemptNumber: number) { console.log({ 'reconnect': attemptNumber }) }

    /**
     * 连接超时
     * @param timeout 
     */
    @OnIOMessage("connect_timeout")
    connect_timeout(timeout: number) { console.log({ 'connect_timeout': timeout }) }

    /**
     * 连接出错
     * @param error 
     */
    @OnIOMessage("connect_error")
    connect_error(error: Error) { console.log("connect_error:", error.message) }
}