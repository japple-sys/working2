import fs from "fs";
import path from "path";
const logFilePath = path.join(__dirname, 'trade_log.txt');
export const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });