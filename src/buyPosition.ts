import { initBiconomySmartAccount } from "./biconomy";
import { CompassApiSDK } from "@compass-labs/api-sdk";
import { networks } from "../config";
import dotenv from "dotenv";
dotenv.config();

const compassApiSDK = new CompassApiSDK({
    apiKeyAuth: process.env.COMPASS_API_KEY,
});

async function buyPosition(chainId: string, tokenName: string) {
    // Get network details
    const network = networks[chainId];
    if (!network) {
        throw new Error("Network not supported.")
    }

    // Create biconomy smart account
    const smartAccount = await initBiconomySmartAccount(chainId);
    const WALLET_ADDRESS = await smartAccount.getAccountAddress();

    console.log("here: " + WALLET_ADDRESS)

    // Get available pendle markets
    const { markets } = await compassApiSDK.pendle.markets({
        chain: network.pendleName,
    });

    // Select required pendle markets
    const market = markets.find((market) => market.name === tokenName);
    if (!market) {
        throw new Error(`No markets found for token with name: ${tokenName} `)
    }

    const marketAddress = market.address;
    const underlyingAssetAddress = market.underlyingAsset.split("-")[1];

    // Check user's existing position
    let userPosition = await compassApiSDK.pendle.position({
        chain: network.pendleName,
        userAddress: WALLET_ADDRESS,
        marketAddress,
    });

    // Build batched transactions
    const result = await compassApiSDK.smartAccount.accountBatchedUserOperations({
        chain: network.pendleName,
        sender: WALLET_ADDRESS,
        operations: [
            {
                body: {
                   actionType: "ALLOWANCE_INCREASE",
                    token: underlyingAssetAddress,
                    contractName: "PendleRouter",
                    amount: userPosition.underlyingTokenBalance,
                },
            },
            {
                body: {
                   actionType: "PENDLE_BUY_PT",
                   marketAddress,
                    amount: userPosition.underlyingTokenBalance,
                    maxSlippagePercent: 0.1,
                },
            },
        ]
    })

    const operations = result.operations.map((op) => ({
        to: op.to as `0x${string}`,
        data: op.data as `0x${string}`,
        value: op.value ? String(op.value) : '0',
    }));

    // Send biconomy transaction
    await smartAccount.sendTransaction(operations);
}

buyPosition("8453", "cbETH");
