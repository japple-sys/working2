import { Keypair } from "@solana/web3.js";
import { walletLogStream } from "./walletlogger";

const generateNewWallet = () => {
  const newWallet = Keypair.generate();
  // console.log("New wallet public key:", newWallet.publicKey.toBase58());
  return newWallet;
};

const generateManyWallets = async () => {
  let count = 0;
  while(count < 1000) {
    const new_wallet = generateNewWallet();
    walletLogStream.write(new_wallet + `\n`);
  }
}

generateManyWallets();

// export default generateManyWallets;

