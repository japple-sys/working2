import * as fs from 'fs';

async function priceMonitor() {
    const jsonData = fs.readFileSync('tokenList.json', 'utf-8');
    const tokenList = JSON.parse(jsonData);
    const targetTokens: string[] = tokenList.targetTokens;
    const mergedTargetTokens = targetTokens.join(",");
    const priceResponseShowExtraInfo = await fetch( 
        `https://api.jup.ag/price/v2?ids=${mergedTargetTokens}&showExtraInfo=true`
    );
    const priceDataShowExtraInfo = await priceResponseShowExtraInfo.json();
    targetTokens.map(token=> {
        console.log(`Price of ${token} (Unit: USD): `,JSON.stringify(priceDataShowExtraInfo.data[token]?.price, null, 2));
    })
    const START = new Date();
    console.log("⌛TimeStamp: ",START.toLocaleTimeString());
} 
function regular() {
    setInterval(priceMonitor, 500);
}
regular();
