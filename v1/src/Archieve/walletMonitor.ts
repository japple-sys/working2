import WebSocket from 'ws';
import dotenv from 'dotenv';
import {
    Connection,
    clusterApiUrl,
    PublicKey
} from '@solana/web3.js';

dotenv.config();
const RPC_URL = process.env.RPC_URL || clusterApiUrl('mainnet-beta');
const connection = new Connection(RPC_URL, 'confirmed');

export async function walletMonitor(WEBSOCKET_URL:string, walletAddress:string, action:Function) {
    const wss_uri = WEBSOCKET_URL;
    const websocket = new WebSocket(wss_uri, {
        rejectUnauthorized: false // Disable SSL verification
    });
    websocket.on('open', () => {
        const payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "logsSubscribe",
            "params": [
                {
                    "mentions": [`${walletAddress}`]
                },
                {
                    "commitment": "finalized"
                }
            ]
        }
        websocket.send(JSON.stringify(payload));
        startPing(websocket);
    });
    websocket.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.params?.result != undefined){
            console.log(message.params.result);
            if(message.params.result.value.logs.includes("4aR3jtFKWuYzkNE27WG4V7Jt6DDhwKcc2qjzN5Tkpump")){
                console.log("🐓🐓🐓")
            }
            action();
        } else { console.log("None") }
    });
    websocket.on('error', (error) => {
        console.error("WebSocket error:", error);
    });
    websocket.on('close', () => {
        console.log("WebSocket connection closed.");
    });
}

function startPing(ws:WebSocket) {
    setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        }
    }, 30000); // Ping every 30 seconds
}