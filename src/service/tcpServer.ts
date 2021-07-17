import { Provide, App } from "@midwayjs/decorator"
import { Application } from "@cairui/midway-tcpserver"

@Provide()
export class TcpServerService {
    @App()
    app: Application

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
}