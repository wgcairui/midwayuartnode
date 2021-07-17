import { saveClassMetadata, saveModule, Scope, ScopeEnum, attachClassMetadata } from "@midwayjs/decorator"


export const IO_CONTROLLER_KEY = "IO:controll"

export const IO_EVENT_KEY = "IO:event"

export enum IOEventTypeEnum {
    ON_CONNECTION = 'IO:onConnection',
    ON_DISCONNECTION = 'IO:onDisconnection',
    ON_MESSAGE = 'IO:onMessage',
    EMIT = 'IO:Emit'
}

export interface IOEventInfo {
    /**
     * web socket event name in enum
     */
    eventType: IOEventTypeEnum;
    /**
     * decorator method name
     */
    propertyName: string;

    descriptor: PropertyDescriptor;
    /**
     * the event name by user definition
     */
    messageEventName?: string;
}

/**
 * IOServer控制器
 * @returns 
 */
export function IOControll(): ClassDecorator {
    return (target: any) => {
        saveModule(IO_CONTROLLER_KEY, target)

        saveClassMetadata(
            IO_CONTROLLER_KEY,
            {},
            target
        )
        Scope(ScopeEnum.Request)(target)
    }
}

/**
 * 监听连接
 * @returns 
 */
export function OnConnection(): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        attachClassMetadata(
            IO_EVENT_KEY,
            {
                eventType: IOEventTypeEnum.ON_CONNECTION,
                propertyName: propertyKey,
                descriptor
            } as IOEventInfo,
            target.constructor
        )
    }
}

/**
 * 监听离线
 * @returns 
 */
export function OnDisConnection(): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        attachClassMetadata(
            IO_EVENT_KEY,
            {
                eventType: IOEventTypeEnum.ON_DISCONNECTION,
                propertyName: propertyKey,
                descriptor
            } as IOEventInfo,
            target.constructor
        )
    }
}

/**
 * 监听事件
 * @param messageEventName 
 * @default "data"
 * @returns 
 */
export function OnIOMessage(messageEventName: string = "data"): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        attachClassMetadata(
            IO_EVENT_KEY,
            {
                eventType: IOEventTypeEnum.ON_MESSAGE,
                messageEventName,
                propertyName: propertyKey,
                descriptor
            } as IOEventInfo,
            target.constructor
        )
    }
}

/**
 * 触发事件
 * @param messageEventName 事件名,慎用data事件,逻辑错误将导致爆栈
 * @returns 
 */
export function OnIOEmit(messageEventName: string): MethodDecorator {
    return (target, propertyKey, descriptor) => {
        attachClassMetadata(
            IO_EVENT_KEY,
            {
                eventType: IOEventTypeEnum.EMIT,
                messageEventName,
                propertyName: propertyKey,
                descriptor
            } as IOEventInfo,
            target.constructor
        )
    }
}
