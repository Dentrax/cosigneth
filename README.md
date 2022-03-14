<p align="center"><a href="https://github.com/Dentrax/cosigneth" target="_blank"><img height="128" src="https://raw.githubusercontent.com/Dentrax/cosigneth/main/.res/logo.png"></a></p>

<h1 align="center"><a href="https://cosigneth.dev">cosigneth</a></h1>

<div align="center">
 <strong>
   An experimental decentralized application for storing and verifying container image signatures as an NFT on Ethereum*
 </strong>
</div>

<br />

<p align="center">
  <a href="https://opensource.org/licenses/Apache-2"><img src="https://img.shields.io/badge/License-Apache-blue.svg?style=flat-square" alt="MIT"></a>
  <a href="https://github.com/Dentrax/cosigneth/releases/latest"><img src="https://img.shields.io/github/release/Dentrax/cosigneth.svg?style=flat-square" alt="GitHub release"></a>
  <a href="https://goreportcard.com/report/github.com/Dentrax/cosigneth"><img src="https://goreportcard.com/badge/github.com/Dentrax/cosigneth?style=flat-square" alt="Go Report"></a>
  <a href="https://github.com/Dentrax/cosigneth/actions?workflow=test"><img src="https://img.shields.io/github/workflow/status/Dentrax/cosigneth/Test?label=build&logo=github&style=flat-square" alt="Build Status"></a>
  <a href="https://app.netlify.com/sites/cosigneth/deploys"><img src="https://api.netlify.com/api/v1/badges/d843e41a-1308-472c-9feb-1e0d507234d4/deploy-status" alt="Netlify"></a>
</p>

<br />

*cosigneth*, is a decentralized application that runs on Ethereum Rinkeby Testnet. Each signature stored as an NFT using [EIP-721](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md) standard. Sign your image digest using your public address and verify them on the blockchain by Solidity [contract](https://github.com/Dentrax/cosigneth/blob/main/src/contracts/Cosigneth.sol). Custom [serverless function](https://github.com/Dentrax/cosigneth/tree/main/src/functions) is created to interact with OCI registiries with your given [JWT token](https://docs.docker.com/registry/spec/auth/jwt).
We use [ethers.signMessage()](https://docs.ethers.io/v5/api/signer/#Signer-signMessage) to sign given [image digest](https://github.com/opencontainers/image-spec/blob/main/descriptor.md#digests) using your injected wallet. By giving digest and corresponding signature, we can recover public wallet address by using [ECDSA-tryRecover](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/ECDSA.sol) method. See _Appendix F_ in [yellowpaper](https://ethereum.github.io/yellowpaper/paper.pdf) for more information.

# How to use

## Prerequisites

* Injected Wallet ([Metamask](https://metamask.io), etc.)
* An Ethereum wallet address
* [Switch network](https://umbria.network/connect/ethereum-testnet-rinkeby) to Rinkeby
* Request 0.1 test ETH from [Chainlink](https://faucets.chain.link) Faucet

## Instructions

### Signing

1. Jump to https://cosigneth.dev
2. Connect your wallet
3. Create a registry token

```bash
$ curl -L -X POST 'https://auth.docker.io/token' \
-H 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'grant_type=password' \
--data-urlencode 'username=$USERNAME' \
--data-urlencode 'password=$PASSWORD' \
--data-urlencode 'service=registry.docker.io' \
--data-urlencode 'client_id=dockerengine' \
--data-urlencode 'access_type=offline' \
--data-urlencode 'scope=repository:$IMAGE:pull,push'
```

> _Replace `$USERNAME`, `$PASSWORD` and `$IMAGE` with yours to [get an access token](https://docs.docker.com/registry/spec/auth/token) from Docker Registry v2 with `300`s expire duration._

4. Pass your OCI _image reference_ and _token (Without Bearer)_
5. Wait until image reference validation and signing process
6. Done! Click the generated [Transaction Hash (Txn)](https://info.etherscan.com/what-is-a-transaction-hash-txhash) on the UI and jump to [Etherscan](https://etherscan.io/)

### Verifying

1. Jump to https://cosigneth.dev
2. Connect your wallet
3. Pass your OCI _image reference_ and _a public wallet address_
4. Wait until fetching signature tags from registry API and verifying process on [EVM](https://ethereum.org/en/developers/docs/evm)
5. Done! Check your verification result on the UI

# How It Works?

```mermaid
sequenceDiagram
    autonumber
    
	Frontend->>Web3.js: Initialize Contract ABI

    Frontend->>Web3.js: window.ethereum
	Web3.js->>+Wallet: Connect

	Wallet--)-Frontend: Accounts

	Note over Frontend: Sign

	rect rgba(0, 0, 255, .1)
		  Frontend->>+Function: Image Check Prelight
		  Function--)-Frontend: Return Digest
	  
		  Frontend->>+Web3.js: web3.eth.sign()
		  Web3.js--)-Frontend: Signature
	  
		  Frontend->>+Ethereum: mint()
		  Ethereum--)-Frontend: Transaction Hash
	  
		  Frontend->>+Function: Attach ETH Object to Image
		  Function--)-Frontend: Status Code
	end

	Note over Frontend: Verify

	rect rgba(0, 255, 0, .1)
		Frontend->>+Function: Get ETH Object
		Function--)-Frontend: Signatures

		Frontend->>+Ethereum: nft.methods.verify()
		Ethereum--)-Frontend: Verify Result
	end
```

# Running on Local

## Web

```bash
$ cd src
$ yarn install
$ yarn dev
```

## Server

```bash
$ cd src/functions
$ go run . -port 8080
```

# Known Issues

* If transaction failed, we attach ETH object anyway. (not actually signed but it will look like that)
* We haven't a resiliency mechanism in case we couldn't talk with Registry API. (actually signed but won't look like that)

# Tech Stack

## Frontend

* [Next.js](https://github.com/vercel/next.js)
* [Material UI](https://github.com/mui/material-ui)
* [Alchemy Web3](https://github.com/alchemyplatform/alchemy-web3)

## Backend

* [Ethereum](https://github.com/ethereum/go-ethereum)
* [Solidity](https://github.com/ethereum/solidity) + [OpenZeppelin](https://github.com/OpenZeppelin/openzeppelin-contracts)
* [Hardhat](https://github.com/NomicFoundation/hardhat)
* [Go](https://github.com/golang/go)
* [TypeScript](https://github.com/microsoft/TypeScript)
* [cosign](https://github.com/sigstore/cosign)
* [go-containerregistry](https://github.com/google/go-containerregistry)

## Hosting

* [Netlify](https://www.netlify.com)

# License

The base project code is licensed under [Apache License 2.0](https://opensource.org/licenses/Apache-2.0) unless otherwise specified. Please see the **[LICENSE](https://github.com/Dentrax/cosigneth/blob/main/LICENSE)** file for more information.
