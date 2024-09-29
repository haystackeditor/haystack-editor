// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract Counter {
  uint256 public count;

  // Function to get the current count
  function get() public returns (uint256) {
    inc();
    dec();
    return count;
  }

  // Function to increment count by 1
  function inc() public {
    count += 1;
  }

  // Function to decrement count by 1
  function dec() public {
    // This function will fail if count = 0
    count -= 1;
  }
}
