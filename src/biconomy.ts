import {
    BiconomySmartAccountV2,
	createMultiChainValidationModule,
	createSmartAccountClient,
	DEFAULT_MULTICHAIN_MODULE,
} from "@biconomy/account";
import {
	createWalletClient,
	type Hex,
	http,
	webSocket,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { networks } from "../config";
import dotenv from "dotenv";

dotenv.config();
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

export function initViemAccount() {
	return privateKeyToAccount(PRIVATE_KEY);
}

export async function initBiconomySmartAccount(chainId: string) : Promise<BiconomySmartAccountV2> {

    const network = networks[chainId];

    const viemAccount = initViemAccount();

	// Initialize wallet client
	const walletClient = createWalletClient({
		account: viemAccount,
		chain: network.viemChain,
		transport: network.rpcUrl.startsWith("http")
			? http(network.rpcUrl)
			: webSocket(network.rpcUrl),
	});

	// Create multi-chain module to be set as default validation module
	const multiChainModule = await createMultiChainValidationModule({
		signer: walletClient,
		moduleAddress: DEFAULT_MULTICHAIN_MODULE,
	});

	// Initiate smart account params
	const smartAccountParams = {
		signer: walletClient,
		bundlerUrl: network.bundlerUrl,
		biconomyPaymasterApiKey: network.biconomyPaymasterApiKey,
		defaultValidationModule: multiChainModule,
		activeValidationModule: multiChainModule,
	};

	// Initialize smart account
	const smartAccount = await createSmartAccountClient(smartAccountParams);

	// Return smart account
	return smartAccount;
    
}
