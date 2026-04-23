// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TicketNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    event TicketMinted(
        uint256 indexed tokenId,
        address indexed to,
        string tokenURI
    );

    constructor(address initialOwner)
        ERC721("VeVuiVe Ticket NFT", "VVVT")
        Ownable()
    {
        _transferOwnership(initialOwner);
        _nextTokenId = 1;
    }

    function mintTicket(address to, string memory uri)
        external
        onlyOwner
        returns (uint256)
    {
        require(to != address(0), "Invalid recipient");

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(to, tokenId);

        if (bytes(uri).length > 0) {
            _setTokenURI(tokenId, uri);
        }

        emit TicketMinted(tokenId, to, uri);

        return tokenId;
    }

    function getCurrentTokenId() external view returns (uint256) {
        if (_nextTokenId == 1) {
            return 0;
        }
        return _nextTokenId - 1;
    }
}