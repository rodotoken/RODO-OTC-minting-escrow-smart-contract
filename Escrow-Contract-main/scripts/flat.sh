#!/usr/bin/env bash

for contract in "Escrow"
do
  npx hardhat flatten contracts/$contract.sol > flatten/$contract.flatten.sol
done