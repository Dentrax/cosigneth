import axios from 'axios';

const COSIGNETH_URL = '/.netlify/functions/api';

const instance = axios.create({
	baseURL: COSIGNETH_URL,
	timeout: 15000,
});

export type ImageCheckRequest = {
  image: string;
  token: string;
}

export type ImageSignRequest = {
  image: string;
  token: string;
  signature: string;
  address: string;
  blockchain: string;
  txn: string;
  network: string;
  chainId: number;
}

export type ImageSignedRequest = {
  image: string;
  signer: string;
}

// doCheck is kind of preflight check before sending
// actual sign request in order to ensure whether the
// given image reference and token is valid
export const doCheck = async (req: ImageCheckRequest) => {
  let res = await instance.get('check', {
    headers: {
      'Authorization': `Bearer ${req.token}`
    },
    params: {
      image: req.image,
    }
  })
  .then(response => {
    if (response.status == 200) {
      return {
        status: true,
        response: response.data
      }
    }
    return {
      status: false,
      response: response
    }
  })
  .catch(function (err) {
    return {
      status: false,
      response: err.response.data
    }
 })
 return res;
};

// doSign is the actual sign request to store signature
// in the given image reference
export const doSign = async (req: ImageSignRequest) => {
  let res = instance.post('sign', {
      image: req.image,
      blockchain: req.blockchain,
      address: req.address,
      txn: req.txn,
      network: req.network,
      chainId: req.chainId,
      signature: req.signature,
    }, {
      headers: {
        'Authorization': `Bearer ${req.token}`,
      },
    })
    .then(response => {
      if (response.status == 201) {
        return {
          status: true,
          response: response.data
        }
      }
      return {
        status: false,
        response: response.status.toString()
      }
    })
    .catch(err => {
      return {
        status: false,
        response: err.response.data
      }
    });
    return res;
};

// doSigned returns list of stored signature if given image signed by signer
export const doSigned = async (req: ImageSignedRequest) => {
  let res = await instance.get('signed', {
    params: {
      image: req.image,
      signer: req.signer,
    }
  })
  .then(response => {
    if (response.status == 200) {
      return {
        status: true,
        response: response.data
      }
    }
    return {
      status: false,
      response: response.status.toString()
    }
  })
  .catch(err => {
    return {
      status: false,
      response: err.response.data
    }
 })
 return res;
};