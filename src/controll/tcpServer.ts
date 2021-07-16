import { Provide, Inject } from "@midwayjs/decorator"
import { TCPControll, OnConnection, Context, OnDisConnection, OnTCPMessage, OnTCPEmit, OnTCPWrite } from "@cairui/midway-tcpserver"

@Provide()
@TCPControll()
export class TcpControll {

    @Inject()
    ctx: Context

    @OnConnection()
    async connecting() {
        console.log(this.ctx.address());

    }

    @OnDisConnection()
    async disconnecting(reason: string) {
        console.log({ reason });

    }

    @OnTCPMessage("data")
    @OnTCPEmit("datass")
    @OnTCPWrite()
    async data(arg: any) {
        console.log({ arg });
        this.ctx.once("datass", a => {
            console.log({ a }, 'datasss');
        })
        return "ddddddddddddd"
    }

    @OnTCPMessage("datass")
    async test(arg: any) {


    }

}
