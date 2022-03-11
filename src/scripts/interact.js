const { createAlchemyWeb3 } = require("@alch/alchemy-web3");

const web3 = createAlchemyWeb3(process.env.NEXT_PUBLIC_ALCHEMY_URL);

const contract = require("../artifacts/contracts/Cosigneth.sol/Cosigneth.json");
const contractAddress = "0x1a0278c2402aa06d88a8d29c0cac8422e983bd55";

const nft = new web3.eth.Contract(contract.abi, contractAddress);

// invoke to connect to wallet account
export const connect = async () => {
    if (window.ethereum) {
      try {
        const addresses = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const obj = {
          status: true,
          address: addresses[0],
        };
        return obj;
      } catch (err) {
        return {
            status: false,
            address: null,
            error: err.message
        }
      }
    } else {
      return {
            status: false,
            address: null,
            error: "You must install MetaMask!"
        }
    }
}

export const sign = async (data, address) => {
    try {
        let signature = await web3.eth.sign(web3.utils.sha3(data), address);
        console.log(signature);
        return {
            status: true,
            result: signature,
        };
    } catch (err) {
        return {
            status: false,
            result: err.message,
        };
    }
};

export const verify = async (image, signer, digest, signature) => {
  try {
      const result = await nft.methods.verify(image, signer, web3.utils.sha3(digest), signature).call();
      return {
          status: true,
          result: result,
      };
  } catch (err) {
      return {
          status: false,
          result: err.message,
      };
  }
};

export const mint = async (image, signedDigest) => {
  if (!window.ethereum.selectedAddress) {
    return {
        status: false,
        error: "You must connect to wallet first!",
        result: '',
    }
  }

  const transactionParameters = {
    to: contractAddress,
    from: window.ethereum.selectedAddress,
    value: parseInt(0).toString(16),
    gasLimit: "0",
    data: nft.methods.mint(image, signedDigest).encodeABI(),
  };
  
  // Sign the transaction
  try {
    const txn = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [transactionParameters],
    });
    return {
      success: true,
      txn: txn,
      result: 'Transaction sent!',
    };
  } catch (error) {
    return {
      success: false,
      result: error.message,
      txn: '',
    }
  }
};

export const info = async () => {
    if (!window.ethereum.selectedAddress) {
        return {
            status: false,
            error: "You must connect to wallet first!",
            result: "",
            network: "",
            chainId: ""
        }
    }

    try {
        const chainId = await web3.eth.getChainId();
        const network = await web3.eth.net.getNetworkType();
        return {
            status: true,
            network: network,
            chainId: chainId,
            result: "",
        }
    } catch (error) {
        return {
            status: false,
            result: error.message,
            network: "",
            chainId: ""
        }
    }
}