import { Provide, Init, Scope, ScopeEnum } from "@midwayjs/decorator"
import { Context } from "@cairui/midway-tcpserver"

type mac = string

@Provide()
@Scope(ScopeEnum.Singleton)
export class Cache {
    registerTime: Map<string, NodeJS.Timeout>
    socket: Map<mac, Context>

    @Init()
    init() {
        this.registerTime = new Map()
        this.socket = new Map()
    }
}