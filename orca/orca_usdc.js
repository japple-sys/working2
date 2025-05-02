const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const {
  WhirlpoolContext,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  buildWhirlpoolClient,
  PriceMath,
  ParsableWhirlpool,
} = require("@orca-so/whirlpools-sdk");
const { Wallet } = require("@coral-xyz/anchor");
const { wss } = require("../../webSocketServer");

class WhirlpoolMonitor {
  constructor(connection, whirlpool, callback) {
    this.connection = connection;
    this.whirlpool = whirlpool;
    this.callback = callback;
  }

  start_monitoring() {
    this.whirlpool_subscription_id = this.connection.onAccountChange(
      this.whirlpool,
      this.update_whirlpool.bind(this)
    );
  }

  async stop_monitoring() {
    await this.connection.removeAccountChangeListener(
      this.whirlpool_subscription_id
    );
  }

  updated() {
    if (this.whirlpool_sqrt_price_emitted?.eq(this.whirlpool_data.sqrtPrice))
      return;

    this.whirlpool_sqrt_price_emitted = this.whirlpool_data.sqrtPrice;
    this.callback(this.whirlpool_update_slot, this.whirlpool_data);
  }

  update_whirlpool(account_info, context) {
    const whirlpool_data = ParsableWhirlpool.parse(
      this.whirlpool,
      account_info
    );
    this.whirlpool_data = whirlpool_data;
    this.whirlpool_update_slot = context.slot;
    this.updated();
  }
}

async function monitorSolUsdcRateOnOrca() {
  const RPC_ENDPOINT_URL =
    "https://mainnet.helius-rpc.com/?api-key=fed3c26c-47ff-4647-8389-b411a64dd235";

  const commitment = "confirmed";

  const connection = new Connection(RPC_ENDPOINT_URL, commitment);
  const dummy_wallet = new Wallet(Keypair.generate());
  const ctx = WhirlpoolContext.from(
    connection,
    dummy_wallet,
    ORCA_WHIRLPOOL_PROGRAM_ID
  );
  const client = buildWhirlpoolClient(ctx);

  const SOL_USDC_WHIRLPOOL = new PublicKey(
    "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE"
  );
  const whirlpool = await client.getPool(SOL_USDC_WHIRLPOOL);
  const token_a = whirlpool.getTokenAInfo();
  const token_b = whirlpool.getTokenBInfo();

  const whirlpool_monitor = new WhirlpoolMonitor(
    connection,
    whirlpool.getAddress(),
    (slot, whirlpool_data) => {
      const price = PriceMath.sqrtPriceX64ToPrice(
        whirlpool_data.sqrtPrice,
        token_a.decimals,
        token_b.decimals
      ).toFixed(token_b.decimals);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              tag: "orca_usdc",
              price: price,
            })
          );
        }
      });
    }
  );
  whirlpool_monitor.start_monitoring();
}
module.exports = { monitorSolUsdcRateOnOrca };
