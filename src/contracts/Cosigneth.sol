// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Cosigneth is ERC721, Ownable, Pausable, ReentrancyGuard {
    using SafeMath for uint256;
    using Strings for uint256;
    using Counters for Counters.Counter;

    struct Signature {
        address signer;
        string image;
        string digest;
    }

    mapping(string => Signature[]) public signatures;

    Counters.Counter private _totalSupply;

    constructor() ERC721("Cosigneth", "CSGN") {}

    // PUBLIC

    /**
     * @dev Safely mints `image` with given `digest` and transfers it to signer address.
     *
     * @param image, the container image reference.
     * @param digest, the SHA3 of container image digest.
     * See https://github.com/opencontainers/image-spec/blob/master/descriptor.md#digests
     */
    function mint(
        string memory image, 
        string memory digest
    ) public payable whenNotPaused nonReentrant {
        Signature memory _sign = Signature(msg.sender, image, digest);

        signatures[image].push(_sign);

        _totalSupply.increment();
        _safeMint(msg.sender, _totalSupply.current());
    }

    /**
    * @dev Verify the image against given digest and recover signer address from a message by using their signature
    * 
    * @param image, the container image reference.
    * @param signer, signer's public address.
    * @param digest, the digest is the signed digest. What is recovered is the signer address.
    * @param signature, the signature is generated using web3.eth.sign()
    */
    function verify(
        string memory image,
        address signer,
        bytes32 digest,
        bytes memory signature
    ) public view returns (bool) {
        address resolvedSigner = ECDSA.recover(digest, signature);
        require(resolvedSigner != address(0), "could not resolve signer address from given digest and signature");
        require(address(signer) == address(resolvedSigner), "given signer address is not signer of digest");
        
        require(signatures[image].length > 0, "image reference did not sign");

        int found = 0;
        for(uint i = 0; i < signatures[image].length; i++){
            if (resolvedSigner == signatures[image][i].signer) {
                found++;
            }
        }

        require(found > 0, "image verification failed");
        return true;
    }

    function get(string memory image) public view returns (Signature[] memory) {
        return signatures[image];
    }

    // OWNER

    /// @dev withdraw funds for to specified account
    function withdraw() external onlyOwner {
        uint balance = address(this).balance;
        require(balance > 0, "No ether left to withdraw");

        payable(msg.sender).transfer(address(this).balance);
    }

    // INTERNAL

    function totalSupply() public view returns (uint256) {
        return _totalSupply.current();
    }
}
