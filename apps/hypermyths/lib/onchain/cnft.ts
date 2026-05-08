import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";
import { getDasRpcUrl, getMintAuthorityKeypair } from "@/lib/onchain/solana";

type MintCnftResult = {
  signature: string;
  assetId: string | null;
  treeAddress: string;
  collectionAddress: string | null;
};

async function findAssetIdByOwnerAndUri(input: {
  ownerWallet: string;
  metadataUri: string;
}): Promise<string | null> {
  const rpcUrl = getDasRpcUrl();
  if (!rpcUrl) {
    return null;
  }

  const response = await fetchWithTimeout(
    rpcUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "hypermyths-search-assets",
        method: "getAssetsByOwner",
        params: {
          ownerAddress: input.ownerWallet,
          page: 1,
          limit: 50,
          sortBy: {
            sortBy: "recent_action",
            sortDirection: "desc",
          },
        },
      }),
    },
    30_000,
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    result?: {
      items?: Array<{
        id?: string;
        content?: {
          json_uri?: string;
        };
      }>;
    };
  };

  const match = payload.result?.items?.find(
    (item) => item.content?.json_uri === input.metadataUri,
  );
  return match?.id ?? null;
}

export async function mintTrailerCnft(input: {
  ownerWallet: string;
  name: string;
  metadataUri: string;
}): Promise<MintCnftResult> {
  const env = getEnv();
  if (!env.CNFT_MERKLE_TREE_ADDRESS) {
    throw new Error("CNFT_MERKLE_TREE_ADDRESS is required for cNFT minting.");
  }
  if (!env.SOLANA_RPC_URL) {
    throw new Error("SOLANA_RPC_URL is required for cNFT minting.");
  }

  const authority = getMintAuthorityKeypair();
  const [
    umiBundle,
    umiCore,
    bubblegumModule,
  ] = await Promise.all([
    import("@metaplex-foundation/umi-bundle-defaults"),
    import("@metaplex-foundation/umi"),
    import("@metaplex-foundation/mpl-bubblegum"),
  ]);

  const umi = umiBundle
    .createUmi(env.SOLANA_RPC_URL)
    .use(bubblegumModule.mplBubblegum());
  const signer = umi.eddsa.createKeypairFromSecretKey(authority.secretKey);
  umi.use(umiCore.keypairIdentity(signer));

  const owner = umiCore.publicKey(input.ownerWallet);
  const merkleTree = umiCore.publicKey(env.CNFT_MERKLE_TREE_ADDRESS);

  const tx = await bubblegumModule
    .mintV2(umi, {
      leafOwner: owner,
      merkleTree,
      metadata: {
        name: input.name.slice(0, 32),
        uri: input.metadataUri,
        sellerFeeBasisPoints: 0,
        creators: [
          {
            address: umi.identity.publicKey,
            verified: true,
            share: 100,
          },
        ],
        collection: umiCore.none(),
      },
    })
    .sendAndConfirm(umi);

  const signature = bs58.encode(tx.signature);
  const assetId = await findAssetIdByOwnerAndUri({
    ownerWallet: new PublicKey(input.ownerWallet).toBase58(),
    metadataUri: input.metadataUri,
  });

  return {
    signature,
    assetId,
    treeAddress: env.CNFT_MERKLE_TREE_ADDRESS,
    collectionAddress: env.CNFT_COLLECTION_ADDRESS ?? null,
  };
}
