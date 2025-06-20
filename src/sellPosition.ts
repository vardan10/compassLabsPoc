import { initBiconomySmartAccount, initViemAccount } from "./biconomy";
import { CompassApiSDK } from "@compass-labs/api-sdk";
import dotenv from "dotenv";
import { networks } from "../config";

dotenv.config();

const compassApiSDK = new CompassApiSDK({
    apiKeyAuth: process.env.COMPASS_API_KEY,
});

async function sellPosition(chainId: string, tokenName: string) {
    const transactions: { to: string, data: string, value: number }[] = [];

    // Get network details
    const network = networks[chainId];

    // Init viem account
    const account = initViemAccount();
    const WALLET_ADDRESS = account.address;

    // Create biconomy smart account
    const smartAccount = await initBiconomySmartAccount(chainId);

    // Get available pendle markets
    const { markets } = await compassApiSDK.pendle.markets({
        chain: network.pendleName,
    });

    console.log("Available markets: " + JSON.stringify(markets))

    // Select required pendle markets
    // Select required pendle markets
    const market = markets.find((market) => market.name === tokenName);

    if (!market) {
        throw new Error(`No markets found for token with name: ${tokenName} `)
    }

    const marketAddress = market.address;
    const underlyingAssetAddress = market.underlyingAsset.split("-")[1];
    const ptAddress = market.pt.split("-")[1];
    const ytAddress = market.yt.split("-")[1];

    // Get any user positions
    const userPosition = await compassApiSDK.pendle.position({
        chain: network.pendleName,
        userAddress: WALLET_ADDRESS,
        marketAddress,
    });

    const pTAllowance = await compassApiSDK.universal.allowance({
        chain: network.pendleName,
        user: WALLET_ADDRESS,
        token: ptAddress,
        contractName: "PendleRouter",
    });

    if (pTAllowance.amount < userPosition.ptBalance) {
        // Set new allowance if current PT allowance for Pendle Router is insufficient
        const setAllowanceForPtTx = await compassApiSDK.universal.allowanceSet({
            chain: network.pendleName,
            sender: WALLET_ADDRESS,
            token: ptAddress,
            contractName: "PendleRouter",
            amount: userPosition.ptBalance,
        });

        transactions.push({
            to: setAllowanceForPtTx.to,
            data: setAllowanceForPtTx.data,
            value: setAllowanceForPtTx.value,
        })
    }

    // Sell PT for the market’s Underlying Asset
    const sellPtTx = await compassApiSDK.pendle.sellPt({
        chain: network.pendleName,
        sender: WALLET_ADDRESS,
        marketAddress,
        amount: userPosition.ptBalance,
        maxSlippagePercent: 0.1,
    });

    transactions.push({
        to: sellPtTx.to,
        data: sellPtTx.data,
        value: sellPtTx.value,
    });

    // Send biconomy transaction
    await smartAccount.sendTransaction(transactions);
}

await sellPosition("8453", "mUSDC");
