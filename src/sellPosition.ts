import { initBiconomySmartAccount, initViemAccount } from "./biconomy";
import { CompassApiSDK } from "@compass-labs/api-sdk";
import dotenv from "dotenv";
import { networks } from "../config";
import { ContractName } from "@compass-labs/api-sdk/models/operations/genericallowance";

dotenv.config();

const compassApiSDK = new CompassApiSDK({
    apiKeyAuth: process.env.COMPASS_API_KEY,
});

async function sellPosition(chainId: string, tokenName: string) {
    // Get network details
    const network = networks[chainId];

    // Create biconomy smart account
    const smartAccount = await initBiconomySmartAccount(chainId);
    const WALLET_ADDRESS = await smartAccount.getAccountAddress();

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
    const ptAddress = market.pt.split("-")[1];
    const ytAddress = market.yt.split("-")[1];

    // Get any user positions
    const userPosition = await compassApiSDK.pendle.position({
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
                    token: ptAddress,
                    contractName: "PendleRouter",
                    amount: userPosition.ptBalance,
                },
            },
            {
                body: {
                    actionType: "PENDLE_SELL_PT",
                    marketAddress,
                    amount: userPosition.ptBalance,
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
    const userOP = await smartAccount.sendTransaction(operations);
    const txHash = await userOP.waitForTxHash();
    console.log("Here: " + JSON.stringify(txHash))
}

await sellPosition("8453", "cbETH");
