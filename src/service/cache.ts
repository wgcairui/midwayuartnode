import { Provide, Init, Scope, ScopeEnum } from "@midwayjs/decorator"
import { Context } from "@cairui/midway-tcpserver"
import { registerConfig } from "../interface"

type mac = string

@Provide()
@Scope(ScopeEnum.Singleton)
export class Cache {
    socket: Map<mac, Context>
    registerConfig: Partial<registerConfig>

    @Init()
    init() {
        this.socket = new Map()

        this.registerConfig = {}
    }
}