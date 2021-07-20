import { Provide, Config, Inject } from "@midwayjs/decorator"
import { ioConfig, ioClient } from "@cairui/midway-io.client"
import { EVENT } from "../interface"



@Provide()
export class ioClientService {

    @Config("io")
    ioConfig: ioConfig

    @Inject()
    ioClient: ioClient

    /**
     * 设备上线
     * @param mac 
     * @param stat 
     */
    terminalOn(mac: string | string, stat: boolean = true) {
        this.ioClient.io.emit(EVENT.terminalOn, mac, stat)
    }


    /**
     * 设备离线
     * @param mac 
     * @param stat 
     */
    terminalOff(mac: string | string, stat: boolean = true) {
        this.ioClient.io.emit(EVENT.terminalOff, mac, stat)
    }

    getIO() {
        return this.ioClient.io
    }

}