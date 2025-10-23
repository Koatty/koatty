/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2021-12-01 17:45:52
 * @LastEditTime: 2024-11-04 18:27:44
 */
import { Config } from "../src/index";

export class ConfigTest {
    @Config("bb")
    bb: String;


    /**
     * getBB
     */
    public getBB() {
        return this.bb;
    }
}