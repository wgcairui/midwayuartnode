import { ILifeCycle } from "@midwayjs/core";
import { Configuration } from '@midwayjs/decorator';
import { join } from "path"
import * as ioClient from "@cairui/midway-io.client"
@Configuration({
    conflictCheck: true,
    imports: [
        ioClient
    ],
    importConfigs: [
        join(__dirname, "./config")
    ]
})

export class ContainerLifeCycle implements ILifeCycle {

    async onReady() {


    }
}
