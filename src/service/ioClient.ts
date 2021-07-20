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
        console.log(`send ${mac} 上线事件`);
        this.ioClient.io.emit(EVENT.terminalOn, mac, stat)
    }


    /**
     * 设备离线
     * @param mac 
     * @param stat 
     */
    terminalOff(mac: string | string, stat: boolean = true) {
        console.log(`send ${mac} 离线事件`);
        this.ioClient.io.emit(EVENT.terminalOff, mac, stat)
    }

    /**
     * dtu所有挂载的设备全部超时
     * @param mac 
     * @param pid 
     * @param num 
     */
    terminalMountDevTimeOut(mac: string, pid: number, num: number) {
        this.ioClient.io.emit(EVENT.terminalMountDevTimeOut, mac, pid, num)
    }

    /**
     * dtu挂载的设备部分指令超时
     * @param mac 
     * @param pid 
     * @param TimeOutContents 
     */
    instructTimeOut(mac: string, pid: number, TimeOutContents: string[]) {
        this.ioClient.io.emit(EVENT.instructTimeOut, mac, pid, TimeOutContents)
    }

    getIO() {
        return this.ioClient.io
    }

}