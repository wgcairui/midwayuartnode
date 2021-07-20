import { Provide, Init, Scope, ScopeEnum } from "@midwayjs/decorator"
import { Context } from "@cairui/midway-tcpserver"
import { registerConfig } from "../interface"

type mac = string
type pid = number

@Provide()
@Scope(ScopeEnum.Singleton)
export class Cache {
    /**
     * 连接的所有客户端
     */
    socket: Map<mac, Context>
    /**
     * 服务器下发的配置
     */
    registerConfig: Partial<registerConfig>
    /**
     * dtu挂载的pid列表
     */
    pids: Map<mac, Set<number>>
    /**
     * dtu下每个pid超时的次数
     */
    timeOuts: Map<mac, Map<pid, number>>

    @Init()
    init() {
        this.socket = new Map()
        this.pids = new Map()
        this.timeOuts = new Map()
        this.registerConfig = {}
    }
}