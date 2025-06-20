import {
	base
} from "viem/chains";
import dotenv from "dotenv";
import { Chain } from 'viem';

dotenv.config();

export interface NetworkConfig {
  name: string;
  viemChain: Chain;
  rpcUrl: string;
  bundlerUrl: string;
  biconomyPaymasterApiKey: string;
  pendleName: any;
}

export interface Networks {
  [chainId: string]: NetworkConfig;
}

export const networks : Networks = {
    "8453": {
        name: "Base",
        viemChain: base,
        rpcUrl: process.env.BASE_RPC_URL!,
        bundlerUrl: process.env.BASE_BUNDLER_URL!,
        biconomyPaymasterApiKey: process.env.BASE_PAYMASTER_API_KEY!,
        pendleName: "base:mainnet"
    }
}