export type eventType = 'QueryInstruct' | 'OprateInstruct' | 'ATInstruct'

export interface socketResult { buffer: Buffer | string, useTime: number, useByte: number }

export interface Query {
    DevMac: string
    events: string
    content: string | string[]
    result?: string
    eventType: eventType
    //listener: (buffer: Buffer | any) => void
}
// apollo server result
export interface ApolloMongoResult {
    msg: string
    ok: number
    n: number
    nModified: number
    upserted: any
}
export interface registerConfig {
    clients: string;
    IP: string;
    Name: string;
    MaxConnections: number;
    Port: number;
    UserID: string
}
export interface queryObject {
    mac: string;
    type: number;
    protocol: string,
    pid: number,
    timeStamp: number
    content: string,
    time: string
}
export interface queryObjectServer extends Query {
    mac: string;
    type: number;
    mountDev: string
    protocol: string,
    pid: number,
    timeStamp: number
    content: string[],
    time: string
    Interval: number
    useTime: number
    useBytes: number
}
export interface queryOkUp extends queryObject {
    contents: IntructQueryResult[]
}
export interface IntructQueryResult {
    content: string
    buffer: Buffer | string;
    useTime: number
    useByte: number
}
export interface socketNetInfo {
    readonly ip: string;
    readonly port: number;
    mac: string;
    jw: string;
}
export interface client extends socketNetInfo {
    uart: string
    AT: boolean
    CacheQueryInstruct: queryObjectServer[];
    CacheOprateInstruct: instructQuery[];
    CacheATInstruct: DTUoprate[],
    timeOut: Map<number, number>,
    TickClose: boolean,
    pids: Set<number>
}

export interface allSocketInfo {
    NodeName: string;
    Connections: number | Error;
    SocketMaps: socketNetInfo[];
}

export interface nodeInfo {
    hostname: string;
    totalmem: string;
    freemem: string;
    loadavg: number[];
    type: string;
    uptime: string;
    userInfo: any;
}


export interface timelog {
    content: string,
    num: number
}

export interface instructQuery extends Query {
    pid: number
    type: number
    Interval?: number
}
export type AT = 'Z' | 'VER' | 'UART=1' | 'LOCATE=1' | 'IMEI' | 'ICCID' | 'IMSI' | string
// ????????????????????????
export type DTUoprate = Query


/**
 * ?????????????????????
 */
export interface serverOptions {
    serverUrl: string
}


declare module "@cairui/midway-tcpserver" {
    interface Context {
        Property: Partial<Uart.socketNetInfo>
    }
}

export enum EVENT {
    /**
     * ??????????????????
     */
    terminalOn = "terminalOn",
    /**
     *  ??????????????????
     */
    terminalOff = "terminalOff",
    /**
     * ??????????????????????????????
     */
    terminalMountDevTimeOut = "terminalMountDevTimeOut",
    /**
     *  ??????????????????????????????
     */
    terminalMountDevTimeOutRestore = "terminalMountDevTimeOutRestore",
    /**
     * ??????????????????
     */
    instructOprate = 'instructOprate',
    /**
     *  ??????????????????
     */
    instructTimeOut = 'instructTimeOut',
    /**
     *  ????????????
     */
    register = "register",
    /**
     *  ??????????????????
     */
    registerSuccess = "registerSuccess",
    /**
     *  ?????????????????????
     */
    query = "query",
    /**
     *  ??????Tcp????????????
     */
    ready = "ready",
    /**
     *  ??????Tcp????????????
     */
    startError = "startError",
    /**
     *  ??????????????????
     */
    alarm = "alarm",
    /**
     *  ????????????????????????
     */
    instructQuery = "instructQuery",
    /**
     *  DTU AT??????
     */
    DTUoprate = 'DTUoprate',
    /**
     * ??????????????????
     */
    deviceopratesuccess = "deviceopratesuccess",
    /**
     * AT????????????
     * 
     */
     dtuopratesuccess = "dtuopratesuccess"
}