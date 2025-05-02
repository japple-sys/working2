import { CommitmentLevel, SubscribeRequest } from "@triton-one/yellowstone-grpc";
import Client from "@triton-one/yellowstone-grpc";
import { MARKET_STATE_LAYOUT_V3 } from "@raydium-io/raydium-sdk";
import { BufferRingBuffer } from "../buffer/buffer";

export const bufferRing = new BufferRingBuffer(5000);

export async function streamOpenbook(client:Client) {
  const stream = await client.subscribe();
  // Collecting all incoming events.
  stream.on("data", (data) => {
    if (data.account != undefined) {
      bufferRing.enqueue(data.account.account.data);
    }
  });

  const openBookRequest: SubscribeRequest = {
    "slots": {},
    "accounts": {
      "raydium": {
        "account": [],
        "filters": [
          {
            "memcmp": {
              "offset": MARKET_STATE_LAYOUT_V3.offsetOf('quoteMint').toString(),
              "base58": "So11111111111111111111111111111111111111112"
            }
          }
        ],
        "owner": ["srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX"] //Openbook program ID
      }
    },
    "transactions": {},
    "blocks": {},
    "blocksMeta": {},
    "accountsDataSlice": [],
    "commitment": CommitmentLevel.PROCESSED,
    entry: {}
  }
  // Sending a subscription request.
  await new Promise<void>((resolve, reject) => {
    stream.write(openBookRequest, (err: null | undefined) => {
      if (err === null || err === undefined) {
        resolve();
      } else {
        reject(err);
      }
    });
  }).catch((reason) => {
    console.error(reason);
    throw reason;
  });
}