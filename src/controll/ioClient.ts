import { Provide, Inject } from "@midwayjs/decorator"
import { ioClientService } from "../service/ioClient"
import { IOControll, OnConnection, OnIOEmit, OnIOMessage } from "../decorator"

@Provide()
@IOControll()
export class IOClientControll {

    @Inject()
    ctx: ioClientService

    @OnConnection()
    connect() {
        console.log(this.ctx.io.id);

    }

    @OnIOMessage("accont")
    @OnIOEmit("register")
    async accont() {
        return {}
    }

    @OnIOMessage("registerSuccess")
    async register(data: any) {
        console.log({ data });

    }
}