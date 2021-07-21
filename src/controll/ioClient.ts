import { Provide, Inject, App } from "@midwayjs/decorator"
import { Application } from "@cairui/midway-tcpserver"
import { ioClientService } from "../service/ioClient"
import { IOControll, OnConnection, OnIOEmit, OnIOMessage } from "@cairui/midway-io.client"
import { Cache } from "../service/cache"
import { tool } from "../service/tool"
import { TcpServerService } from "../service/tcpServer"
import { Fetch } from "../service/fetch"
import { ApolloMongoResult, DTUoprate, EVENT, instructQuery, IntructQueryResult, queryObjectServer, queryOkUp, registerConfig } from "../interface"

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
    async query(Query: queryObjectServer) {
        //Query.mac = Query.DevMac

        /* console.log({
            o: this.TcpServerService.isfree(Query.mac),
            c: this.Cache.socket.get(Query.mac)?.Property
        }); */

        if (this.TcpServerService.isfree(Query.mac)) {
            // 获取mac对应的socket实例
            const socket = this.Cache.socket.get(Query.mac)!
            // 给socket上锁,避免被抢占
            this.TcpServerService.lock(socket)
            // 获取或新建超时实例
            const timeOut = this.Cache.timeOuts.get(Query.mac) || this.Cache.timeOuts.set(Query.mac, new Map()).get(Query.mac)
            // 存储pid
            const pids = this.Cache.pids.get(Query.mac) || this.Cache.pids.set(Query.mac, new Set()).get(Query.mac)
            if (!pids.has(Query.pid)) pids.add(Query.pid)


            // 存储结果集
            const IntructQueryResults = [] as IntructQueryResult[];
            // 如果设备在超时列表中，则把请求指令精简为一条，避免设备离线查询请求阻塞
            // if (this.timeOut.has(Query.pid)) Query.content = [Query.content.pop()!]
            // 
            //let len = Query.content.length
            // 便利设备的每条指令,阻塞终端,依次查询
            // console.time(Query.timeStamp + Query.mac + Query.Interval);
            for (let i = Query.content.length - 1; i > -1; i--) {
                const content = Query.content[i]
                // 构建查询字符串转换Buffer
                const queryString = Query.type === 485 ? Buffer.from(content, "hex") : Buffer.from(content + "\r", "utf-8");
                // 持续占用端口,知道最后一个释放端口
                // console.log(i);
                const data = await this.TcpServerService.write(socket, queryString, i === 0)
                IntructQueryResults.push({ content, ...data });
            }
            // this.socketsb.getSocket().emit('free')
            // console.timeEnd(Query.timeStamp + Query.mac + Query.Interval);
            // console.log(IntructQueryResults);
            // 统计
            // console.log(new Date().toLocaleTimeString(), Query.mac + ' success++', this.Cache.length, len);
            Query.useBytes = IntructQueryResults.map(el => el.useByte).reduce((pre, cu) => pre + cu)
            Query.useTime = IntructQueryResults.map(el => el.useTime).reduce((pre, cu) => pre + cu)
            // 获取socket状态
            // 如果结果集每条指令都超时则加入到超时记录
            if (IntructQueryResults.every((el) => !Buffer.isBuffer(el.buffer))) {
                const num = timeOut.get(Query.pid) || 1
                // 触发查询超时事件
                this.ctx.terminalMountDevTimeOut(Query.mac, Query.pid, num)
                // 超时次数=10次,硬重启DTU设备
                console.log(`${new Date().toLocaleString()}###DTU ${Query.mac}/${Query.pid}/${Query.mountDev}/${Query.protocol} 查询指令超时 [${num}]次,pids:${Array.from(pids)},interval:${Query.Interval}`);
                // 如果挂载的pid全部超时且次数大于10,执行设备重启指令
                if (num === 10 && timeOut.size >= pids.size && Array.from(timeOut.values()).every(num => num >= 10)) {
                    console.log(`###DTU ${Query.mac}/pids:${Array.from(pids)} 查询指令全部超时十次,硬重启,断开DTU连接`)
                    this.TcpServerService.resatrtSocket(socket)
                }
                timeOut.set(Query.pid, num + 1);
            } else {
                // 如果有超时记录,删除超时记录，触发data
                timeOut.delete(Query.pid)
                // 刷选出有结果的buffer
                const contents = IntructQueryResults.filter((el) => Buffer.isBuffer(el.buffer));
                // 获取正确执行的指令
                const okContents = new Set(contents.map(el => el.content))
                // 刷选出其中超时的指令,发送给服务器超时查询记录
                const TimeOutContents = Query.content.filter(el => !okContents.has(el))
                if (TimeOutContents.length > 0) {
                    this.ctx.instructTimeOut(Query.mac, Query.pid, TimeOutContents)
                    console.log(`###DTU ${Query.mac}/${Query.pid}/${Query.mountDev}/${Query.protocol}指令:[${TimeOutContents.join(",")}] 超时`);
                    console.log({ Query, IntructQueryResults });
                }
                // 合成result
                const SuccessResult = Object.assign<queryObjectServer, Partial<queryOkUp>>(Query, { contents, time: new Date().toString() }) as queryOkUp;

                // 加入结果集
                //console.log(SuccessResult);

                this.Fetch.queryData(SuccessResult)
            }

        }
    }

    /**
     * 终端设备操作指令
     */
    @OnIOMessage(EVENT.instructQuery)
    @OnIOEmit(EVENT.deviceopratesuccess)
    async instructQuery(Query: instructQuery) {
        const query = Query as instructQuery
        // 构建查询字符串转换Buffer
        const queryString = query.type === 485 ? Buffer.from(query.content as string, "hex") : Buffer.from(query.content as string + "\r", "utf-8");
        const result: Partial<ApolloMongoResult> = {
            ok: 0,
            msg: "挂载设备响应超时，请检查指令是否正确或设备是否在线",
            upserted: ''
        };

        return await this.TcpServerService.awaitDtu(Query.DevMac).then(async socket => {
            const { buffer } = await this.TcpServerService.write(socket, queryString)
            result.upserted = buffer
            if (Buffer.isBuffer(buffer)) {
                result.ok = 1;
                // 检测接受的数据是否合法
                switch (Query.type) {
                    case 232:
                        result.msg = "设备已响应,返回数据：" + buffer.toString("utf8").replace(/(\(|\n|\r)/g, "");
                        break;
                    case 485:
                        const str = (buffer.readIntBE(1, 1) !== parseInt((<string>Query.content).slice(2, 4))) ? "设备已响应，但操作失败,返回字节：" : "设备已响应,返回字节："
                        result.msg = str + buffer.toString("hex");
                }
            }
            console.log({ Query, result });
            return [Query.events, result]

        }).catch(() => {
            console.log(`${EVENT.instructQuery} is error`, Query);
            return [Query.events, result]
        })
    }

    /**
     * 发送终端设备AT指令
     * @param Query 
     */
    @OnIOMessage(EVENT.DTUoprate)
    @OnIOEmit(EVENT.dtuopratesuccess)
    async DTUoprate(Query: DTUoprate) {
        const query = Query as DTUoprate
        // 构建查询字符串转换Buffer
        const queryString = Buffer.from(query.content + "\r", "utf-8")
        const result: Partial<ApolloMongoResult> = {
            ok: 0,
            msg: '挂载设备响应超时，请检查指令是否正确或设备是否在线',
            upserted: ''
        }
        return await this.TcpServerService.awaitDtu(Query.DevMac).then(async socket => {
            const { buffer } = await this.TcpServerService.write(socket, queryString, false)
            result.upserted = buffer
            const parse = this.TcpServerService.tool.ATParse(buffer)
            if (parse.AT && parse.msg) {
                result.ok = 1
                result.msg = parse.msg
                this.TcpServerService.getDtuInfo(socket).then(el => {
                    this.Fetch.dtuInfo(el)
                    // this.TcpServerService.unlock(socket)
                })
                this.TcpServerService.unlock(socket)
            }

            console.log({ Query, parse, p: socket.Property.lock });
            return [Query.events, result]
        }).catch(() => {
            console.log(`${EVENT.instructQuery} is error`, Query);
            return [Query.events, result]
        })
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